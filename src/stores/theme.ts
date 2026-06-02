/**
 * Theme Store - 主题管理状态管理模块
 * 
 * 本文件使用 Zustand 实现应用主题的状态管理，支持双主题（科技风/像素风）
 * 和明暗模式切换，提供主题持久化功能
 * 
 * @module stores/theme
 * @dependencies zustand - 轻量级状态管理库
 */

import { create } from 'zustand';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * ThemeType - 主题风格类型
 * - tech: 科技风格主题（现代、简洁、渐变效果）
 * - pixel: 像素风格主题（复古、像素化、游戏感）
 */
export type ThemeType = 'tech' | 'pixel';

/**
 * ColorScheme - 颜色方案类型
 * - dark: 暗色模式（深色背景，适合长时间使用）
 * - light: 亮色模式（浅色背景，适合明亮环境）
 */
export type ColorScheme = 'dark' | 'light';

// ============================================================================
// 状态接口定义
// ============================================================================

/**
 * ThemeStoreState - 主题商店状态接口
 * 定义了主题管理所需的所有状态字段和操作函数
 * 
 * 状态字段：
 * @property theme - 当前主题风格（tech/pixel）
 * @property colorScheme - 当前颜色方案（dark/light）
 * @property isInitialized - 是否已初始化（用于避免 SSR 闪烁）
 * 
 * 操作函数：
 * @method setTheme - 设置主题风格
 * @method setColorScheme - 设置颜色方案
 * @method toggleColorScheme - 切换颜色方案（暗色↔亮色）
 * @method initialize - 从 localStorage 初始化主题
 */
interface ThemeStoreState {
  // 状态字段
  theme: ThemeType;              // 当前主题风格
  colorScheme: ColorScheme;      // 当前颜色方案
  isInitialized: boolean;        // 是否已初始化
  
  // 操作函数
  setTheme: (theme: ThemeType) => void;           // 设置主题风格
  setColorScheme: (scheme: ColorScheme) => void;  // 设置颜色方案
  toggleColorScheme: () => void;                  // 切换颜色方案
  initialize: () => void;                         // 初始化主题
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * STORAGE_KEY - localStorage 存储键名
 * 用于持久化用户主题偏好
 */
const STORAGE_KEY = 't8-canvas-theme';

/**
 * DEFAULT_THEME - 默认主题配置
 * - theme: tech（科技风格）
 * - colorScheme: dark（暗色模式）
 */
const DEFAULT_THEME: { theme: ThemeType; colorScheme: ColorScheme } = {
  theme: 'tech',
  colorScheme: 'dark',
};

// ============================================================================
// Zustand Store 实例
// ============================================================================

/**
 * useThemeStore - 主题管理 Zustand Store
 * 
 * 采用 Zustand 的 create 方法创建状态容器，提供以下核心功能：
 * 
 * 1. 双主题支持：
 *    - tech: 科技风格（现代 UI，渐变效果，适合专业场景）
 *    - pixel: 像素风格（复古 UI，像素元素，适合创意场景）
 * 
 * 2. 明暗模式：
 *    - 支持 dark/light 两种颜色方案
 *    - 一键切换，即时生效
 * 
 * 3. 主题持久化：
 *    - 使用 localStorage 保存用户偏好
 *    - 页面刷新后自动恢复
 * 
 * 4. CSS 变量同步：
 *    - 自动更新 document.documentElement 的 data 属性
 *    - 触发 CSS 变量变化，实现主题切换
 * 
 * @returns Zustand store 实例，可通过 useThemeStore() 在组件中使用
 */
export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  // ==========================================================================
  // 初始状态
  // ==========================================================================
  theme: DEFAULT_THEME.theme,          // 默认科技风格
  colorScheme: DEFAULT_THEME.colorScheme,  // 默认暗色模式
  isInitialized: false,                // 未初始化状态

  // ==========================================================================
  // 设置主题风格
  // ==========================================================================
  /**
   * setTheme - 设置主题风格
   * 
   * @param theme - 新的主题风格（tech/pixel）
   * 
   * 执行流程：
   * 1. 更新 state 中的 theme 字段
   * 2. 设置 document.documentElement 的 data-theme 属性
   * 3. 保存到 localStorage 进行持久化
   * 
   * 视觉效果：
   * - tech: 应用科技风格 CSS 变量（渐变、圆角、阴影）
   * - pixel: 应用像素风格 CSS 变量（直角、像素边框、复古色）
   */
  setTheme(theme) {
    set({ theme });
    // 更新 DOM 属性，触发 CSS 变量变化
    document.documentElement.setAttribute('data-theme', theme);
    // 持久化到 localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), theme }));
  },

  // ==========================================================================
  // 设置颜色方案
  // ==========================================================================
  /**
   * setColorScheme - 设置颜色方案
   * 
   * @param colorScheme - 新的颜色方案（dark/light）
   * 
   * 执行流程：
   * 1. 更新 state 中的 colorScheme 字段
   * 2. 设置 document.documentElement 的 data-color-scheme 属性
   * 3. 保存到 localStorage 进行持久化
   * 
   * 视觉效果：
   * - dark: 应用暗色 CSS 变量（深色背景、浅色文字）
   * - light: 应用亮色 CSS 变量（浅色背景、深色文字）
   */
  setColorScheme(colorScheme) {
    set({ colorScheme });
    // 更新 DOM 属性，触发 CSS 变量变化
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    // 持久化到 localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), colorScheme }));
  },

  // ==========================================================================
  // 切换颜色方案
  // ==========================================================================
  /**
   * toggleColorScheme - 切换颜色方案（暗色↔亮色）
   * 
   * 执行流程：
   * 1. 获取当前颜色方案
   * 2. 切换到相反方案（dark→light 或 light→dark）
   * 3. 调用 setColorScheme 应用新方案
   * 
   * 使用场景：
   * - 主题切换按钮点击事件
   * - 快捷键触发（如 Ctrl+Shift+L）
   */
  toggleColorScheme() {
    const current = get().colorScheme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setColorScheme(next);
  },

  // ==========================================================================
  // 初始化主题
  // ==========================================================================
  /**
   * initialize - 从 localStorage 初始化主题
   * 
   * 执行流程：
   * 1. 检查是否在浏览器环境（window 对象存在）
   * 2. 从 localStorage 读取保存的主题配置
   * 3. 若存在保存的配置，应用到 state 和 DOM
   * 4. 设置 isInitialized=true，标记初始化完成
   * 
   * 注意事项：
   * - 必须在客户端调用（避免 SSR 不匹配）
   * - 建议在 App 组件挂载时调用
   * - 初始化前使用默认主题，避免闪烁
   */
  initialize() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { theme, colorScheme } = JSON.parse(saved);
        // 应用保存的主题配置
        set({ theme, colorScheme, isInitialized: true });
        // 更新 DOM 属性
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-color-scheme', colorScheme);
      } else {
        // 无保存配置，使用默认值并标记已初始化
        set({ isInitialized: true });
      }
    } catch (e) {
      // localStorage 读取失败，使用默认值
      console.warn('主题初始化失败:', e);
      set({ isInitialized: true });
    }
  },
}));
