/**
 * T8-penguin-canvas 应用入口文件
 * 
 * 使用 React 19 的 createRoot API 渲染根组件
 * 通过 StrictMode 在开发模式下检测潜在问题
 * 
 * @module main
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// 创建 React 根实例并渲染 App 组件
// StrictMode 用于在开发模式下检测潜在问题（如副作用、生命周期问题等）
// 在 production 构建中会自动移除，不影响性能
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
