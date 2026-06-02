/**
 * Canvas Store - 画布管理状态管理模块
 * 
 * 本文件使用 Zustand 实现画布列表的状态管理，提供画布的增删改查、激活切换等功能
 * 与后端 API 服务层 (api.ts) 配合，实现画布数据的持久化和同步
 * 
 * @module stores/canvas
 * @dependencies zustand - 轻量级状态管理库
 * @dependencies ../services/api - 后端 API 调用服务
 * @dependencies ../types/canvas - 画布相关类型定义
 */

import { create } from 'zustand';
import type { CanvasListItem } from '../types/canvas';
import * as api from '../services/api';

// ============================================================================
// 状态接口定义
// ============================================================================

/**
 * CanvasStoreState - 画布商店状态接口
 * 定义了画布管理所需的所有状态字段和操作函数
 * 
 * 状态字段：
 * @property canvases - 画布列表数组，按更新时间降序排列
 * @property activeId - 当前激活的画布 ID，用于标识正在编辑的画布
 * @property loading - 加载状态标志，true 表示正在异步加载数据
 * @property error - 错误信息，存储最近一次操作的错误消息
 * 
 * 操作函数：
 * @method loadCanvases - 从后端加载画布列表
 * @method createCanvas - 创建新画布
 * @method deleteCanvas - 删除指定画布
 * @method renameCanvas - 重命名画布
 * @method setActive - 设置当前激活的画布
 */
interface CanvasStoreState {
  // 状态字段
  canvases: CanvasListItem[];      // 画布列表数组
  activeId: string | null;         // 当前激活的画布 ID
  loading: boolean;                // 加载状态标志
  error: string | null;            // 错误信息
  
  // 操作函数
  loadCanvases: () => Promise<void>;                    // 加载画布列表
  createCanvas: (name?: string) => Promise<CanvasListItem | null>;  // 创建画布
  deleteCanvas: (id: string) => Promise<void>;          // 删除画布
  renameCanvas: (id: string, name: string) => Promise<void>;  // 重命名画布
  setActive: (id: string) => void;                      // 设置激活画布
}

// ============================================================================
// Zustand Store 实例
// ============================================================================

/**
 * useCanvasStore - 画布管理 Zustand Store
 * 
 * 采用 Zustand 的 create 方法创建状态容器，提供以下核心功能：
 * 
 * 1. 画布列表管理：
 *    - 从后端加载画布列表并按更新时间降序排序
 *    - 自动选中最新画布（若无激活画布）
 * 
 * 2. 画布 CRUD 操作：
 *    - 创建：调用 API 创建新画布并设为激活状态
 *    - 删除：删除后自动切换到列表中第一个画布
 *    - 重命名：更新画布名称并同步到列表
 * 
 * 3. 激活状态管理：
 *    - 支持手动切换激活画布
 *    - 删除时自动迁移激活状态
 * 
 * 4. 错误处理：
 *    - 所有异步操作均捕获异常并存储错误信息
 *    - 错误信息可在 UI 中展示给用户
 * 
 * @returns Zustand store 实例，可通过 useCanvasStore() 在组件中使用
 */
export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  // ==========================================================================
  // 初始状态
  // ==========================================================================
  canvases: [],        // 空画布列表
  activeId: null,      // 无激活画布
  loading: false,      // 非加载状态
  error: null,         // 无错误信息

  // ==========================================================================
  // 加载画布列表
  // ==========================================================================
  /**
   * loadCanvases - 从后端加载画布列表
   * 
   * 执行流程：
   * 1. 设置 loading=true，清空错误状态
   * 2. 调用 api.listCanvases() 获取画布列表
   * 3. 按 updatedAt 降序排序（最新的在前）
   * 4. 若无激活画布，自动选中第一个（最新的）画布
   * 5. 更新状态：canvases=排序后的列表，loading=false
   * 
   * 错误处理：
   * - 捕获异常后设置 loading=false 和错误信息
   * - 错误信息优先使用异常消息，否则使用默认提示
   */
  async loadCanvases() {
    set({ loading: true, error: null });
    try {
      const list = await api.listCanvases();
      // 按更新时间降序排序（最新的在前）
      const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
      set({
        canvases: sorted,
        loading: false,
        // 若无激活画布，默认选中最新一个
        activeId: get().activeId || sorted[0]?.id || null,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载画布列表失败' });
    }
  },

  // ==========================================================================
  // 创建画布
  // ==========================================================================
  /**
   * createCanvas - 创建新画布
   * 
   * @param name - 可选的画布名称，若不传则由后端生成默认名称
   * @returns 成功时返回创建的画布对象，失败时返回 null
   * 
   * 执行流程：
   * 1. 调用 api.createCanvas(name) 创建画布
   * 2. 将新画布插入列表开头
   * 3. 自动设置新画布为激活状态
   * 4. 返回创建的画布对象
   * 
   * 错误处理：
   * - 捕获异常后设置错误信息
   * - 返回 null 表示创建失败
   */
  async createCanvas(name) {
    try {
      const item = await api.createCanvas(name);
      // 将新画布插入列表开头，并设为激活状态
      set((s) => ({ canvases: [item, ...s.canvases], activeId: item.id }));
      return item;
    } catch (e: any) {
      set({ error: e?.message || '创建画布失败' });
      return null;
    }
  },

  // ==========================================================================
  // 删除画布
  // ==========================================================================
  /**
   * deleteCanvas - 删除指定画布
   * 
   * @param id - 要删除的画布 ID
   * 
   * 执行流程：
   * 1. 调用 api.deleteCanvas(id) 删除后端数据
   * 2. 从本地列表中过滤掉被删除的画布
   * 3. 若被删除的是当前激活画布，则自动切换到列表中第一个画布
   * 4. 更新状态：canvases=过滤后的列表，activeId=新的激活 ID
   * 
   * 错误处理：
   * - 捕获异常后设置错误信息
   * - 删除失败不影响本地状态
   */
  async deleteCanvas(id) {
    try {
      await api.deleteCanvas(id);
      set((s) => {
        // 从列表中过滤掉被删除的画布
        const list = s.canvases.filter((x) => x.id !== id);
        // 若被删除的是当前激活画布，切换到第一个画布
        const activeId = s.activeId === id ? list[0]?.id || null : s.activeId;
        return { canvases: list, activeId };
      });
    } catch (e: any) {
      set({ error: e?.message || '删除失败' });
    }
  },

  // ==========================================================================
  // 重命名画布
  // ==========================================================================
  /**
   * renameCanvas - 重命名画布
   * 
   * @param id - 要重命名的画布 ID
   * @param name - 新的画布名称
   * 
   * 执行流程：
   * 1. 调用 api.renameCanvas(id, name) 更新后端数据
   * 2. 在本地列表中查找对应画布并更新名称
   * 3. 保持列表顺序和其他画布不变
   * 
   * 错误处理：
   * - 捕获异常后设置错误信息
   * - 重命名失败不影响本地状态
   */
  async renameCanvas(id, name) {
    try {
      const updated = await api.renameCanvas(id, name);
      // 在本地列表中更新对应画布的名称
      set((s) => ({
        canvases: s.canvases.map((x) => (x.id === id ? updated : x)),
      }));
    } catch (e: any) {
      set({ error: e?.message || '重命名失败' });
    }
  },

  // ==========================================================================
  // 设置激活画布
  // ==========================================================================
  /**
   * setActive - 设置当前激活的画布
   * 
   * @param id - 要激活的画布 ID
   * 
   * 执行流程：
   * 1. 直接更新 activeId 状态
   * 2. 不触发任何后端请求
   * 
   * 使用场景：
   * - 用户从侧边栏选择画布
   * - 删除画布后自动切换
   * - 创建画布后自动激活
   */
  setActive(id) {
    set({ activeId: id });
  },
}));
