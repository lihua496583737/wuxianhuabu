import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// T8-penguin-canvas 主题状态管理模块
// 支持持久化到 localStorage，管理明暗模式和视觉风格

// 画布主题类型：暗色或亮色
export type CanvasTheme = 'dark' | 'light';

// 主题风格类型：科技风或像素风
export type ThemeStyle = 'tech' | 'pixel';

// 主题状态接口定义
interface ThemeState {
  theme: CanvasTheme;                              // 当前明暗模式
  style: ThemeStyle;                               // 当前视觉风格
  toggleTheme: () => void;                         // 切换明暗模式
  setTheme: (theme: CanvasTheme) => void;          // 设置明暗模式
  toggleStyle: () => void;                         // 切换视觉风格
  setStyle: (style: ThemeStyle) => void;           // 设置视觉风格
}

/**
 * 主题状态管理 Store（支持持久化到 localStorage）
 * - theme: dark | light 明暗模式
 * - style: tech | pixel 视觉风格
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // 默认主题：像素风 + 白天模式（跟随风格联动）
      theme: 'light',
      style: 'pixel',
      
      // 切换明暗模式
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'dark' ? 'light' : 'dark' 
      })),
      
      // 设置明暗模式
      setTheme: (theme) => set({ theme }),
      
      // 切换视觉风格（联动默认模式：科技风默认深色、像素风默认浅色）
      toggleStyle: () =>
        set((state) => {
          const next: ThemeStyle = state.style === 'tech' ? 'pixel' : 'tech';
          return { style: next, theme: next === 'pixel' ? 'light' : 'dark' };
        }),
      
      // 设置视觉风格（联动默认模式）
      setStyle: (style) =>
        set({ style, theme: style === 'pixel' ? 'light' : 'dark' }),
    }),
    {
      name: 't8-canvas-theme',  // localStorage 存储键名
    }
  )
);
