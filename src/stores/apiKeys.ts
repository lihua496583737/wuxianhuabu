import { create } from 'zustand';
import type { ApiSettings } from '../types/canvas';
import * as api from '../services/api';

// T8-penguin-canvas API Key 状态管理模块
// 管理三套通用 Key（贞贞工坊、RunningHub、LLM）及分类 Key

// 三套 Key 的固定 base URL（不可更改）
export const FIXED_ZHENZHEN_BASE = 'https://ai.t8star.org';  // 贞贞工坊/LMM 基础 URL
export const RH_BASE = 'https://www.runninghub.cn';          // RunningHub 基础 URL

// API Keys 状态接口定义
interface ApiKeysState {
  settings: ApiSettings;           // 当前设置
  loading: boolean;                // 加载状态
  error: string | null;            // 错误信息
  loaded: boolean;                 // 是否已加载
  
  load: () => Promise<void>;       // 加载设置
  save: (patch: Partial<ApiSettings>) => Promise<void>;  // 保存设置
}

// 默认设置值
const DEFAULT: ApiSettings = {
  zhenzhenApiKey: '',              // 贞贞工坊 API Key
  zhenzhenBaseUrl: FIXED_ZHENZHEN_BASE,  // 固定基础 URL
  rhApiKey: '',                    // RunningHub API Key
  rhBaseUrl: RH_BASE,              // 固定基础 URL
  llmApiKey: '',                   // LLM API Key
  llmBaseUrl: FIXED_ZHENZHEN_BASE, // 固定基础 URL
  // 分类独立 Key（留空时 fallback 到 zhenzhenApiKey）
  gptImageApiKey: '',     // GPT-Image API Key
  nanoBananaApiKey: '',   // Nano Banana API Key
  mjApiKey: '',           // Midjourney API Key
  veoApiKey: '',          // Veo API Key
  grokApiKey: '',         // Grok API Key
  seedanceApiKey: '',     // Seedance API Key
  sunoApiKey: '',         // Suno API Key
  preferences: { theme: 'dark', language: 'zh-CN' },  // 偏好设置
};

/**
 * API Keys 状态管理 Store
 * 提供加载和保存设置的功能，与后端 API 交互
 */
export const useApiKeysStore = create<ApiKeysState>((set) => ({
  settings: DEFAULT,
  loading: false,
  error: null,
  loaded: false,

  /**
   * 从后端加载设置
   */
  async load() {
    set({ loading: true, error: null });
    try {
      const data = await api.getSettings();
      set({
        settings: { 
          ...DEFAULT, 
          ...data, 
          zhenzhenBaseUrl: FIXED_ZHENZHEN_BASE, 
          llmBaseUrl: FIXED_ZHENZHEN_BASE 
        },
        loading: false,
        loaded: true,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载设置失败' });
    }
  },

  /**
   * 保存设置到后端
   * @param patch - 要更新的设置字段
   */
  async save(patch) {
    set({ loading: true, error: null });
    try {
      await api.updateSettings(patch);
      // 重新拉取（后端会返回脱敏后的 Key）
      const data = await api.getSettings();
      set({
        settings: { 
          ...DEFAULT, 
          ...data, 
          zhenzhenBaseUrl: FIXED_ZHENZHEN_BASE, 
          llmBaseUrl: FIXED_ZHENZHEN_BASE 
        },
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '保存失败' });
    }
  },
}));
