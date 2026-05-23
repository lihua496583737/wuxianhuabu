// ============================================================================
// T8-penguin-canvas Runtime Loader
//
// 职责:
//   1. 注册 .t8c 后缀的 require hook
//      → 读取磁盘加密文件 (T8ENC1\n + AES-256-CBC 密文)
//      → 内存解密为 V8 字节码 (.jsc 等价物)
//      → 通过 bytenode 加载 + Module._compile 把字节码包装为 CommonJS Module
//   2. 兼容相对路径 require('./xxx')(从 .t8c 入口 require 出去时,自动尝试同名 .t8c)
//
// 设计参考: gpt-image-2-web 的 ZZENC1 + py_compile,但改为 Node 体系
//   - Magic Header: T8ENC1\n
//   - Key 派生: SHA256("T8-penguin-canvas-T8star-2026")
//   - 算法: AES-256-CBC (16-byte 随机 IV 内嵌密文头)
//   - 字节码格式: bytenode 标准 .jsc (V8 cached data + 8-byte length header)
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const Module = require('module');

const MAGIC = Buffer.from('T8ENC1\n', 'utf8'); // 7 bytes
const PASSPHRASE = 'T8-penguin-canvas-T8star-2026';
const KEY = crypto.createHash('sha256').update(PASSPHRASE, 'utf8').digest(); // 32 bytes
const IV_LEN = 16;

function isEncrypted(buf) {
  return Buffer.isBuffer(buf) && buf.length > MAGIC.length && buf.slice(0, MAGIC.length).equals(MAGIC);
}

function encryptBuffer(plain) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, ct]);
}

function decryptBuffer(enc) {
  if (!isEncrypted(enc)) {
    throw new Error('[T8ENC1] missing magic header');
  }
  const iv = enc.slice(MAGIC.length, MAGIC.length + IV_LEN);
  const ct = enc.slice(MAGIC.length + IV_LEN);
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

// ---------- bytenode 字节码 → Module ----------
// 不依赖 bytenode 的 .jsc 文件 hook(会在 OS 临时目录创建明文 .jsc + module.paths 丢失 app.asar/node_modules)
// 改为在原 .t8c filename 上下文直接执行字节码，wrapper 手动调用,require 词典指回 fileModule。
let _bytenode = null;
function bytenode() {
  if (_bytenode) return _bytenode;
  _bytenode = require('bytenode');
  return _bytenode;
}

// 从 bytenode 复用:生成占位源码 → vm.Script(cachedData=jsc) 重建 wrapper。
// 按 Node v20+/Electron 33 (V8 12.x) 语义,字节码 header与运行时 V8 版本必须匹配:
// 本脚本加密阶段已在 ELECTRON_RUN_AS_NODE=1 下 compile,与运行时同 V8。
function generateScriptFromBytecode(bytecodeBuffer, filename) {
  // 复制 bytenode generateScript 逻辑:用一段 dummyCode 占位使 vm.Script 接受 cachedData
  // 但需要修补 bytecodeBuffer 中的 hash slot 使之与 dummy 匹配
  const dummy = bytenode().compileCode('"\u200b"');
  // Node 20+ / Electron 33: V8 12.x → fix offsets 12-16
  dummy.subarray(12, 16).copy(bytecodeBuffer, 12);
  dummy.subarray(16, 20).copy(bytecodeBuffer, 16);
  // sourceHash 读取位置 (Node 20+: bytes 8-12)
  const sourceHash = bytecodeBuffer.subarray(8, 12)
    .reduce((sum, n, p) => sum + n * Math.pow(256, p), 0);
  // 构造与 hash 匹配的占位源码 (长度 = sourceHash)
  const dummyCode = sourceHash > 1 ? '"' + '\u200b'.repeat(sourceHash - 2) + '"' : '';
  const script = new vm.Script(dummyCode, {
    cachedData: bytecodeBuffer,
    filename,
    lineOffset: 0,
    columnOffset: 0,
    displayErrors: true,
  });
  if (script.cachedDataRejected) {
    throw new Error('[T8ENC1] bytecode cachedDataRejected: ' + filename);
  }
  return script;
}

// 启动时让 require 能找到 app.asar/node_modules 下的依赖 (express/cors/multer/sharp 等)
function extraNodeModulePaths() {
  const paths = [];
  if (process.resourcesPath) {
    paths.push(path.join(process.resourcesPath, 'app.asar', 'node_modules'));
    paths.push(path.join(process.resourcesPath, 'app', 'node_modules'));
  }
  // 开发模式 → 项目根 node_modules
  paths.push(path.resolve(__dirname, '..', 'node_modules'));
  return paths.filter((p) => {
    try { return fs.existsSync(p); } catch (_) { return false; }
  });
}

// ---------- 注册 .t8c require hook ----------
function registerLoader() {
  if (require.extensions['.t8c']) return; // 防重复注册
  try {
    bytenode();
  } catch (e) {
    console.error('[loader] bytenode require failed:', e.message);
    throw e;
  }

  const _extraPaths = extraNodeModulePaths();
  const os = require('os');
  const tmpRoot = path.join(os.tmpdir(), 't8pc-jsc-' + process.pid);
  try { fs.mkdirSync(tmpRoot, { recursive: true }); } catch (_) {}
  // 进程退出时尝试清理临时临时 jsc (随进程生命周期)
  process.on('exit', () => {
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
  });

  // 依赖 bytenode 已注册的 .jsc handler (能正确 fixBytecode + generateScript)
  // 但不能让 bytenode require(tmp.jsc),否则 fileModule 换成临时路径,paths 丢 app.asar/node_modules。
  // 所以直接调 Module._extensions['.jsc'] 函数,传入 .t8c 的 fileModule。
  const jscHandler = Module._extensions['.jsc'];
  if (typeof jscHandler !== 'function') {
    throw new Error('[loader] bytenode .jsc handler not registered');
  }

  require.extensions['.t8c'] = function (fileModule, filename) {
    const enc = fs.readFileSync(filename);
    const bytecodeBuffer = decryptBuffer(enc);

    // 补上 app.asar/node_modules 等路径,使加密于 resources/backend-enc/ 的后端
    // 能找到 express/cors/multer/sharp 等依赖
    fileModule.paths = Module._nodeModulePaths(path.dirname(filename));
    for (const p of _extraPaths) {
      if (!fileModule.paths.includes(p)) fileModule.paths.push(p);
    }

    // 写个临时 .jsc 供 bytenode 读取。调用后立即删除,磁盘上不会长期存在明文。
    const tmpFile = path.join(
      tmpRoot,
      crypto.createHash('md5').update(filename).digest('hex') + '.jsc',
    );
    fs.writeFileSync(tmpFile, bytecodeBuffer);
    try {
      // 直接调 bytenode 的 .jsc handler,传入 .t8c 的 fileModule (paths 已调好)
      // bytenode 会 fixBytecode + generateScript + runInThisContext + apply wrapper
      jscHandler(fileModule, tmpFile);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    }
  };

  // 让 require('./foo') 在缺少 .js/.json 时自动尝试 .t8c
  const _origResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, ...rest) {
    try {
      return _origResolve.call(this, request, parent, ...rest);
    } catch (e) {
      // 尝试 .t8c
      try {
        return _origResolve.call(this, request + '.t8c', parent, ...rest);
      } catch (_) {
        throw e;
      }
    }
  };
}

registerLoader();

module.exports = {
  registerLoader,
  encryptBuffer,
  decryptBuffer,
  isEncrypted,
  MAGIC,
};
