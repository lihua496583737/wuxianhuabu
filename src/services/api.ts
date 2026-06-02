/**
 * T8-penguin-canvas 后端 API 封装模块
 * 所有请求走 Vite proxy → http://127.0.0.1:18766
 */
import type { ApiSettings, CanvasData, CanvasListItem } from '../types/canvas';

// API 基础路径（通过 Vite proxy 转发到后端）
const BASE = '/api';

/**
 * 通用请求封装函数
 * @param url - 请求 URL
 * @param init - 请求选项
 * @returns Promise<T> 响应数据
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errMsg = data.error || errMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errMsg);
  }
  return res.json();
}

// ========== 状态检测 ==========

/**
 * 检查后端服务状态
 * @returns Promise<boolean> 后端是否可用
 */
export async function checkBackendStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/status`);
    return res.ok;
  } catch {
    return false;
  }
}

// ========== 画布列表管理 ==========

/**
 * 获取画布列表
 * @returns Promise<CanvasListItem[]> 画布列表数组
 */
export async function listCanvases(): Promise<CanvasListItem[]> {
  const res = await request<{ success: boolean; data: CanvasListItem[] }>(`${BASE}/canvas`);
  return res.data || [];
}

/**
 * 创建新画布
 * @param name - 画布名称（可选）
 * @returns Promise<CanvasListItem> 创建的画布信息
 */
export async function createCanvas(name?: string): Promise<CanvasListItem> {
  const res = await request<{ success: boolean; data: CanvasListItem }>(`${BASE}/canvas`, {
    method: 'POST',
    body: JSON.stringify({ name: name || '未命名画布' }),
  });
  return res.data;
}

/**
 * 获取单个画布数据
 * @param id - 画布 ID
 * @returns Promise<CanvasData> 画布完整数据
 */
export async function getCanvasData(id: string): Promise<CanvasData> {
  const res = await request<{ success: boolean; data: CanvasData }>(`${BASE}/canvas/${id}`);
  return res.data;
}

/**
 * 保存画布数据
 * @param id - 画布 ID
 * @param data - 画布完整数据
 */
export async function saveCanvasData(id: string, data: CanvasData): Promise<void> {
  await request(`${BASE}/canvas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 删除画布
 * @param id - 画布 ID
 */
export async function deleteCanvas(id: string): Promise<void> {
  await request(`${BASE}/canvas/${id}`, { method: 'DELETE' });
}

/**
 * 重命名画布
 * @param id - 画布 ID
 * @param name - 新名称
 * @returns Promise<CanvasListItem> 更新后的画布信息
 */
export async function renameCanvas(id: string, name: string): Promise<CanvasListItem> {
  const res = await request<{ success: boolean; data: CanvasListItem }>(
    `${BASE}/canvas/${id}/name`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }
  );
  return res.data;
}

// ========== 设置管理（三套通用 Key + 分类 Key）==========

/**
 * 获取设置（脱敏 Key）
 * @returns Promise<ApiSettings> 设置对象
 */
export async function getSettings(): Promise<ApiSettings> {
  const res = await request<{ success: boolean; data: ApiSettings }>(`${BASE}/settings`);
  return res.data;
}

/**
 * 获取明文 Key（仅用于设置弹窗内眼睛预览，不脱敏）
 * @returns Promise<ApiSettings> 设置对象（含明文 Key）
 */
export async function getRawSettings(): Promise<ApiSettings> {
  const res = await request<{ success: boolean; data: ApiSettings }>(`${BASE}/settings/raw`);
  return res.data;
}

/**
 * 更新设置
 * @param patch - 要更新的设置字段
 */
export async function updateSettings(patch: Partial<ApiSettings>): Promise<void> {
  await request(`${BASE}/settings`, {
    method: 'POST',
    body: JSON.stringify(patch),
  });
}
