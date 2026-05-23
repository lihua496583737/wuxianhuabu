const path = require('path');
const fs = require('fs');

// T8-penguin-canvas 后端配置
// Electron 打包后:
//   - T8PC_PACKAGED=1
//   - T8PC_USER_DATA 指向 app.getPath('userData')(可读写数据目录)
//   - T8PC_RES 指向 process.resourcesPath (只读底包资源)
// 开发模式: 仍然使用项目根目录
const PACKAGED = process.env.T8PC_PACKAGED === '1';
const USER_DATA_DIR = process.env.T8PC_USER_DATA || path.resolve(__dirname, '..', '..');
const PROJECT_DIR = PACKAGED ? USER_DATA_DIR : path.resolve(__dirname, '..', '..');

// 确保打包模式下也存在可写数据目录
if (PACKAGED) {
  try {
    if (!fs.existsSync(PROJECT_DIR)) fs.mkdirSync(PROJECT_DIR, { recursive: true });
  } catch (_) {}
}

const config = {
  // 服务器
  HOST: process.env.HOST || '127.0.0.1',
  PORT: parseInt(process.env.PORT || '18766', 10),
  NODE_ENV: process.env.NODE_ENV || (PACKAGED ? 'production' : 'development'),

  // 打包标识 + 资源路径
  PACKAGED,
  USER_DATA_DIR,
  // 前端 dist/ (生产模式由 Express 托管)
  FRONTEND_DIST: process.env.T8PC_FRONTEND_DIST || path.resolve(__dirname, '..', '..', 'dist'),

  // 数据 / 资源目录(全部位于可写区)
  BASE_DIR: PROJECT_DIR,
  DATA_DIR: path.join(PROJECT_DIR, 'data'),
  INPUT_DIR: path.join(PROJECT_DIR, 'input'),
  OUTPUT_DIR: path.join(PROJECT_DIR, 'output'),
  THUMBNAILS_DIR: path.join(PROJECT_DIR, 'thumbnails'),

  // 数据文件
  CANVAS_FILE: path.join(PROJECT_DIR, 'data', 'canvas_list.json'),
  SETTINGS_FILE: path.join(PROJECT_DIR, 'data', 'settings.json'),
  RH_APPS_FILE: path.join(PROJECT_DIR, 'data', 'rh_apps.json'),

  // 缩略图配置
  THUMBNAIL_SIZE: 160,
  THUMBNAIL_QUALITY: 80,

  // 业务配置
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  // 三套 API Key 默认值(均可在 settings 中覆盖)
  // 贞贞工坊 / LLM 独立 Key 强制走 https://ai.t8star.org
  ZHENZHEN_BASE_URL: 'https://ai.t8star.org',
  RH_BASE_URL: 'https://www.runninghub.cn',
};

module.exports = config;
