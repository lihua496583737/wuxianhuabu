const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// 支持 --port CLI 参数(与 Electron main 进程对齐)
let PORT = config.PORT;
const portIdx = process.argv.indexOf('--port');
if (portIdx >= 0 && process.argv[portIdx + 1]) {
  PORT = parseInt(process.argv[portIdx + 1], 10) || PORT;
}

const app = express();

// ========== 中间件 ==========
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 简易访问日志
app.use((req, _res, next) => {
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  console.log(`[${t}] ${req.method} ${req.path}`);
  next();
});

// ========== 目录初始化 ==========
[
  config.DATA_DIR,
  config.INPUT_DIR,
  config.OUTPUT_DIR,
  config.THUMBNAILS_DIR,
].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ========== 静态资源托管 ==========
app.use('/files/output', express.static(config.OUTPUT_DIR));
app.use('/files/input', express.static(config.INPUT_DIR));
app.use('/files/thumbnails', express.static(config.THUMBNAILS_DIR));
app.use('/output', express.static(config.OUTPUT_DIR));
app.use('/input', express.static(config.INPUT_DIR));

// ========== 健康检查 ==========
app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    service: 't8-penguin-canvas-backend',
    version: '1.1.0',
    packaged: !!config.PACKAGED,
    port: PORT,
    time: new Date().toISOString(),
  });
});

// ========== 业务路由 ==========
const canvasRouter = require('./routes/canvas');
const settingsRouter = require('./routes/settings');
const proxyRouter = require('./routes/proxy');
const filesRouter = require('./routes/files');
const imageOpsRouter = require('./routes/imageOps');

app.use('/api/canvas', canvasRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/files', filesRouter);
app.use('/api/image', imageOpsRouter);

// ========== 生产模式: 同时托管前端 dist/ ==========
// 打包后 Express 托管 frontend(Vite 在 build 产出的静态文件)
// BrowserWindow 直接 loadURL http://127.0.0.1:PORT/  即可
if (config.PACKAGED || process.env.T8PC_SERVE_FRONTEND === '1') {
  const dist = config.FRONTEND_DIST;
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    // SPA fallback: 除了 /api / /files / /output / /input 以外都返回 index.html
    app.get(/^(?!\/(api|files|output|input)).*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
    console.log(`[frontend] 托管前端静态: ${dist}`);
  } else {
    console.warn(`[frontend] dist 不存在: ${dist}`);
  }
}

// ========== 启动 ==========
const HOST = config.HOST;

app.listen(PORT, HOST, () => {
  console.log('==================================================');
  console.log('🐧 T8-penguin-canvas 后端服务');
  console.log('==================================================');
  console.log(`🚀 服务器启动成功!`);
  console.log(`   地址: http://${HOST}:${PORT}`);
  console.log(`   环境: ${config.NODE_ENV}${config.PACKAGED ? ' (packaged)' : ''}`);
  console.log(`   数据目录: ${config.DATA_DIR}`);
  console.log(`   输出目录: ${config.OUTPUT_DIR}`);
  console.log('   按 Ctrl+C 停止服务器...');
  console.log('--------------------------------------------------');
});

module.exports = app;
