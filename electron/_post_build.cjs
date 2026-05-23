// ============================================================================
// _post_build.js — electron-builder 完成后的产物核验脚本
//
// 职责:
//   1. 检查 dist_electron/win-unpacked/resources/backend-enc/*.t8c 是否存在
//   2. 检查 frontend/index.html 是否到位
//   3. 强制移除任何意外混入的明文 backend/src/*.js (双保险)
//   4. 输出最终产物清单
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UNPACKED = path.join(ROOT, 'dist_electron', 'win-unpacked');
const RES = path.join(UNPACKED, 'resources');

function ok(p) {
  console.log('  ✅', path.relative(UNPACKED, p));
}
function bad(p) {
  console.log('  ❌ MISSING', path.relative(UNPACKED, p));
}

function checkFile(p) {
  if (fs.existsSync(p)) ok(p);
  else bad(p);
}

function listDir(p, indent = '    ') {
  if (!fs.existsSync(p)) return;
  for (const name of fs.readdirSync(p)) {
    const full = path.join(p, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      console.log(indent + '📁', name);
      listDir(full, indent + '    ');
    } else {
      console.log(indent + '📄', name, `(${st.size}B)`);
    }
  }
}

function nukePlainBackend() {
  // electron-builder 不应该把明文 backend/src 打进 asar/resources;若存在则强制删
  const candidates = [
    path.join(RES, 'app', 'backend', 'src'),
    path.join(RES, 'backend', 'src'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log('  🧹 nuke plaintext:', path.relative(UNPACKED, c));
      fs.rmSync(c, { recursive: true, force: true });
    }
  }
}

function main() {
  console.log('==========================================');
  console.log('[post-build] 验证打包产物');
  console.log('==========================================');

  if (!fs.existsSync(UNPACKED)) {
    console.error('  ❌ dist_electron/win-unpacked 不存在,先跑 npm run dist:dir');
    process.exit(1);
  }

  console.log('[1] 加密后端字节码:');
  checkFile(path.join(RES, 'backend-enc', 'server.t8c'));
  checkFile(path.join(RES, 'backend-enc', 'config.t8c'));
  checkFile(path.join(RES, 'backend-enc', 'routes', 'canvas.t8c'));
  checkFile(path.join(RES, 'backend-enc', 'routes', 'settings.t8c'));
  checkFile(path.join(RES, 'backend-enc', 'routes', 'proxy.t8c'));
  checkFile(path.join(RES, 'backend-enc', 'routes', 'files.t8c'));
  checkFile(path.join(RES, 'backend-enc', 'routes', 'imageOps.t8c'));

  console.log('\n[2] 前端 dist:');
  checkFile(path.join(RES, 'frontend', 'index.html'));
  checkFile(path.join(RES, 'frontend', 'assets'));

  console.log('\n[3] 清除可能混入的明文后端源码:');
  nukePlainBackend();

  console.log('\n[4] resources/ 完整结构:');
  listDir(RES);

  console.log('\n[post-build] DONE ✅');
}

if (require.main === module) main();
