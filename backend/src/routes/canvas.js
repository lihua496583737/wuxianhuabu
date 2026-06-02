// T8-penguin-canvas 画布数据 CRUD 路由模块
// 实现画布的创建、读取、更新、删除功能
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const router = express.Router();

// ========== 工具函数 ==========

/**
 * 加载画布列表
 * @returns {Array} 画布列表数组
 */
function loadCanvasList() {
  if (!fs.existsSync(config.CANVAS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(config.CANVAS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * 保存画布列表
 * @param {Array} list - 画布列表数组
 */
function saveCanvasList(list) {
  fs.writeFileSync(config.CANVAS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

/**
 * 获取画布文件路径
 * @param {string} id - 画布 ID
 * @returns {string} 画布文件完整路径
 */
function getCanvasFile(id) {
  return path.join(config.DATA_DIR, `canvas_${id}.json`);
}

// ========== 路由处理 ==========

// GET /api/canvas — 获取画布列表
router.get('/', (_req, res) => {
  const list = loadCanvasList();
  res.json({ success: true, data: list });
});

// POST /api/canvas — 创建新画布
router.post('/', (req, res) => {
  const list = loadCanvasList();
  // 生成唯一画布 ID（时间戳 + 随机字符串）
  const id = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const canvas = {
    id,
    name: req.body?.name || '未命名画布',
    nodeCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  list.push(canvas);
  saveCanvasList(list);
  // 初始化空画布数据（包含 nodes、edges、viewport）
  fs.writeFileSync(
    getCanvasFile(id),
    JSON.stringify({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }, null, 2),
    'utf-8'
  );
  res.json({ success: true, data: canvas });
});

// GET /api/canvas/:id — 获取单个画布数据
router.get('/:id', (req, res) => {
  const file = getCanvasFile(req.params.id);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ success: false, error: '画布不存在' });
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: '读取失败：' + e.message });
  }
});

// PUT /api/canvas/:id — 更新画布数据（带防空数据覆盖保护）
router.put('/:id', (req, res) => {
  const file = getCanvasFile(req.params.id);
  const incoming = req.body;
  // 防空数据覆盖保护：如果传入的数据为空且原画布有数据，则拒绝覆盖
  if (
    !incoming ||
    !Array.isArray(incoming.nodes) ||
    (incoming.nodes.length === 0 && fs.existsSync(file))
  ) {
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
    if (existing && Array.isArray(existing.nodes) && existing.nodes.length > 0) {
      console.warn(`⚠ 拒绝空数据覆盖画布 ${req.params.id}(原 ${existing.nodes.length} 节点)`);
      return res.status(400).json({ success: false, error: '拒绝空数据覆盖' });
    }
  }
  fs.writeFileSync(file, JSON.stringify(incoming, null, 2), 'utf-8');
  // 更新列表元数据
  const list = loadCanvasList();
  const item = list.find((x) => x.id === req.params.id);
  if (item) {
    item.nodeCount = incoming.nodes?.length || 0;
    item.updatedAt = Date.now();
    saveCanvasList(list);
  }
  res.json({ success: true });
});

// DELETE /api/canvas/:id — 删除画布
router.delete('/:id', (req, res) => {
  const list = loadCanvasList();
  const filtered = list.filter((x) => x.id !== req.params.id);
  saveCanvasList(filtered);
  const file = getCanvasFile(req.params.id);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ success: true });
});

// PATCH /api/canvas/:id/name — 重命名画布
router.patch('/:id/name', (req, res) => {
  const list = loadCanvasList();
  const item = list.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: '画布不存在' });
  item.name = req.body?.name || item.name;
  item.updatedAt = Date.now();
  saveCanvasList(list);
  res.json({ success: true, data: item });
});

module.exports = router;
