/**
 * API Keys Store - API 密钥管理状态管理模块
 * 
 * 本文件使用 Zustand 实现 API 密钥的状态管理，提供密钥的加载、保存、验证等功能
 * 支持分类 API Key 管理（专属 Key 优先，fallback 到通用 Key）
 * 
 * @module stores/apiKeys
 * @dependencies zustand - 轻量级状态管理库
 * @dependencies ../services/api - 后端 API 调用服务
 * @dependencies ../types/canvas - ApiSettings 类型定义
 */

import { create } from 'zustand';
import * as api from '../services/api';
import type { ApiSettings } from '../types/canvas';

// ============================================================================
// 状态接口定义
// ============================================================================

/**
 * ApiKeysStoreState - API 密钥商店状态接口
 * 定义了 API 密钥管理所需的所有状态字段和操作函数
 * 
 * 状态字段：
 * @property settings - API 密钥设置对象，包含所有服务的密钥配置
 * @property loading - 加载状态标志，true 表示正在异步加载数据
 * @property error - 错误信息，存储最近一次操作的错误消息
 * @property saving - 保存状态标志，true 表示正在保存到后端
 * 
 * 操作函数：
 * @method loadSettings - 从后端加载 API 密钥设置
 * @method saveSettings - 保存 API 密钥设置到后端
 * @method updateField - 更新单个字段的值
 * @method getKeyForService - 根据服务类型获取对应的 API Key（支持 fallback 逻辑）
 */
interface ApiKeysStoreState {
  // 状态字段
  settings: ApiSettings;     // API 密钥设置对象
  loading: boolean;          // 加载状态标志
  error: string | null;      // 错误信息
  saving: boolean;           // 保存状态标志
  
  // 操作函数
  loadSettings: () => Promise<void>;                          // 加载设置
  saveSettings: () => Promise<boolean>;                       // 保存设置
  updateField: (field: keyof ApiSettings, value: string) => void;  // 更新字段
  getKeyForService: (service: string) => string | undefined;  // 获取服务密钥
}

// ============================================================================
// 默认设置
// ============================================================================

/**
 * DEFAULT_SETTINGS - 默认 API 密钥设置
 * 用于初始化状态或重置设置
 * 
 * 默认配置说明：
 * - zhenzhenBaseUrl: 锁定 https://ai.t8star.org（真真 AI 服务）
 * - rhBaseUrl: https://www.runninghub.cn（RunningHub 平台）
 * - llmBaseUrl: 锁定 https://ai.t8star.org（大语言模型服务）
 * - 所有 Key 默认为空字符串，需用户手动填写
 */
const DEFAULT_SETTINGS: ApiSettings = {
  zhenzhenApiKey: '',
  zhenzhenBaseUrl: 'https://ai.t8star.org',
  rhApiKey: '',
  rhBaseUrl: 'https://www.runninghub.cn',
  llmApiKey: '',
  llmBaseUrl: 'https://ai.t8star.org',
  gptImageApiKey: '',
  nanoBananaApiKey: '',
  mjApiKey: '',
  veoApiKey: '',
  grokApiKey: '',
  seedanceApiKey: '',
  sunoApiKey: '',
  preferences: {
    theme: 'dark',
    language: 'zh-CN',
  },
};

// ============================================================================
// Zustand Store 实例
// ============================================================================

/**
 * useApiKeysStore - API 密钥管理 Zustand Store
 * 
 * 采用 Zustand 的 create 方法创建状态容器，提供以下核心功能：
 * 
 * 1. 密钥加载与保存：
 *    - 从后端加载用户配置的 API 密钥
 *    - 保存到后端进行持久化
 * 
 * 2. 分类密钥管理：
 *    - 支持 7 种专用 API Key（GPT 图像/NanoBanana/MJ/Veo/Grok/Seedance/Suno）
 *    - 专用 Key 留空时自动 fallback 到通用的 zhenzhenApiKey
 * 
 * 3. 字段更新：
 *    - 支持更新任意设置字段
 *    - 自动合并到现有设置中
 * 
 * 4. 服务密钥获取：
 *    - 根据服务名称获取对应的 API Key
 *    - 自动处理 fallback 逻辑
 * 
 * @returns Zustand store 实例，可通过 useApiKeysStore() 在组件中使用
 */
export const useApiKeysStore = create<ApiKeysStoreState>((set, get) => ({
  // ==========================================================================
  // 初始状态
  // ==========================================================================
  settings: DEFAULT_SETTINGS,  // 默认设置
  loading: false,              // 非加载状态
  error: null,                 // 无错误信息
  saving: false,               // 非保存状态

  // ==========================================================================
  // 加载设置
  // ==========================================================================
  /**
   * loadSettings - 从后端加载 API 密钥设置
   * 
   * 执行流程：
   * 1. 设置 loading=true，清空错误状态
   * 2. 调用 api.getSettings() 获取后端设置
   * 3. 与默认设置合并（保证字段完整性）
   * 4. 更新状态：settings=合并后的设置，loading=false
   * 
   * 错误处理：
   * - 捕获异常后设置 loading=false 和错误信息
   * - 加载失败时使用默认设置
   */
  async loadSettings() {
    set({ loading: true, error: null });
    try {
      const settings = await api.getSettings();
      // 与默认设置合并，保证字段完整性
      set({
        settings: { ...DEFAULT_SETTINGS, ...settings },
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载设置失败' });
    }
  },

  // ==========================================================================
  // 保存设置
  // ==========================================================================
  /**
   * saveSettings - 保存 API 密钥设置到后端
   * 
   * @returns 成功返回 true，失败返回 false
   * 
   * 执行流程：
   * 1. 设置 saving=true，清空错误状态
   * 2. 调用 api.saveSettings() 保存到后端
   * 3. 保存成功后设置 saving=false
   * 
   * 错误处理：
   * - 捕获异常后设置 saving=false 和错误信息
   * - 返回 false 表示保存失败
   */
  async saveSettings() {
    set({ saving: true, error: null });
    try {
      await api.saveSettings(get().settings);
      set({ saving: false });
      return true;
    } catch (e: any) {
      set({ saving: false, error: e?.message || '保存设置失败' });
      return false;
    }
  },

  // ==========================================================================
  // 更新字段
  // ==========================================================================
  /**
   * updateField - 更新单个设置字段的值
   * 
   * @param field - 要更新的字段名（keyof ApiSettings）
   * @param value - 新的字段值
   * 
   * 执行流程：
   * 1. 直接更新 settings 中对应字段的值
   * 2. 保持其他字段不变
   * 3. 不触发后端保存（需手动调用 saveSettings）
   * 
   * 使用场景：
   * - 表单输入时的实时更新
   * - 批量更新前的预处理
   */
  updateField(field, value) {
    set((s) => ({
      settings: { ...s.settings, [field]: value },
    }));
  },

  // ==========================================================================
  // 获取服务密钥
  // ==========================================================================
  /**
   * getKeyForService - 根据服务类型获取对应的 API Key
   * 
   * @param service - 服务名称（如 'gpt-image', 'mj', 'veo' 等）
   * @returns 对应的 API Key，若未配置则返回 undefined
   * 
   * Fallback 逻辑：
   * 1. 优先返回专用 API Key（如 gptImageApiKey）
   * 2. 若专用 Key 为空，返回通用的 zhenzhenApiKey
   * 3. 若通用 Key 也为空，返回 undefined
   * 
   * 支持的服务映射：
   * - 'gpt-image' -> gptImageApiKey
   * - 'nano-banana' -> nanoBananaApiKey
   * - 'mj' -> mjApiKey
   * - 'veo' -> veoApiKey
   * - 'grok' -> grokApiKey
   * - 'seedance' -> seedanceApiKey
   * - 'suno' -> sunoApiKey
   * - 其他 -> zhenzhenApiKey
   */
  getKeyForService(service) {
    const { settings } = get();
    
    // 服务名到字段名的映射
    const fieldMap: Record<string, keyof ApiSettings> = {
      'gpt-image': 'gptImageApiKey',
      'nano-banana': 'nanoBananaApiKey',
      'mj': 'mjApiKey',
      'veo': 'veoApiKey',
      'grok': 'grokApiKey',
      'seedance': 'seedanceApiKey',
      'suno': 'sunoApiKey',
    };
    
    const field = fieldMap[service];
    if (field) {
      // 专用 Key 优先，fallback 到通用 Key
      return (settings[field] as string) || settings.zhenzhenApiKey;
    }
    
    // 默认返回通用 Key
    return settings.zhenzhenApiKey;
  },
}));
