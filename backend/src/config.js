const path = require('path');
const fs = require('fs');

// T8-penguin-canvas 后端配置模块
// 运行模式说明:
//   - 开发模式：PROJECT_DIR 指向项目根目录，数据目录在项目根下 (data/input/output/thumbnails)
//   - 打包模式：Electron 主进程注入 T8PC_PACKAGED=1 与 T8PC_USER_DATA=<userData>
//              数据/输入/输出/缩略图都位于 userData 目录下（可读写）
//              前端静态产物位于 T8PC_FRONTEND_DIST（默认 resources/frontend）

// 判断是否为打包模式（通过环境变量 T8PC_PACKAGED）
const IS_PACKAGED = process.env.T8PC_PACKAGED === '1';

// 项目根目录：开发模式下为 backend/src/../..，打包模式下由 Electron 设置
const PROJECT_DIR = path.resolve(__dirname, '..', '..');

// 用户数据目录：打包模式下使用 Electron 的 userData，开发模式下使用项目根目录
const USER_DATA = process.env.T8PC_USER_DATA && process.env.T8PC_USER_DATA.trim().length > 0
  ? process.env.T8PC_USER_DATA
  : PROJECT_DIR;

// 数据根目录：根据运行模式选择不同路径
const DATA_ROOT = IS_PACKAGED ? USER_DATA : PROJECT_DIR;

// 导出配置对象
const config = {
  // ========== 服务器配置 ==========
  HOST: process.env.HOST || '127.0.0.1',           // 监听地址
  PORT: process.env.PORT || 18766,                 // 监听端口（注意：与主项目 18765 错开）
  NODE_ENV: process.env.NODE_ENV || (IS_PACKAGED ? 'production' : 'development'), // 运行环境
  IS_PACKAGED,                                     // 是否为打包模式标志

  // ========== 数据/资源目录配置 ==========
  // 开发模式：项目根下的 data/input/output/thumbnails
  // 打包模式：%APPDATA%/T8-PenguinCanvas/data... 走 userData
  BASE_DIR: DATA_ROOT,                             // 基础目录
  DATA_DIR: path.join(DATA_ROOT, 'data'),          // 数据存储目录
  INPUT_DIR: path.join(DATA_ROOT, 'input'),        // 输入文件目录
  OUTPUT_DIR: path.join(DATA_ROOT, 'output'),      // 输出文件目录
  THUMBNAILS_DIR: path.join(DATA_ROOT, 'thumbnails'), // 缩略图目录

  // ========== 数据文件路径 ==========
  CANVAS_FILE: path.join(DATA_ROOT, 'data', 'canvas_list.json'),    // 画布列表文件
  SETTINGS_FILE: path.join(DATA_ROOT, 'data', 'settings.json'),     // 设置文件
  RH_APPS_FILE: path.join(DATA_ROOT, 'data', 'rh_apps.json'),       // RunningHub 应用文件

  // ========== 前端静态产物目录（打包后由 Express 同进程托管）==========
  FRONTEND_DIST: process.env.T8PC_FRONTEND_DIST || (IS_PACKAGED ? '' : path.join(PROJECT_DIR, 'dist')),

  // ========== 缩略图配置 ==========
  THUMBNAIL_SIZE: 160,      // 缩略图尺寸（像素）
  THUMBNAIL_QUALITY: 80,    // 缩略图质量（0-100）

  // ========== 业务配置 ==========
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 最大文件大小（10MB）

  // ========== 三套 API Key 默认值（均可在 settings 中覆盖）==========
  // 贞贞工坊 / LLM 独立 Key 强制走 https://ai.t8star.org
  ZHENZHEN_BASE_URL: 'https://ai.t8star.org',  // 贞贞工坊 API 基础 URL
  RH_BASE_URL: 'https://www.runninghub.cn',    // RunningHub API 基础 URL
};

// 提前创建打包后的数据目录（避免首次启动报错）
if (IS_PACKAGED) {
  for (const dir of [config.DATA_DIR, config.INPUT_DIR, config.OUTPUT_DIR, config.THUMBNAILS_DIR]) {
    try { 
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); 
    } catch (_) {}
  }
}

module.exports = config;
