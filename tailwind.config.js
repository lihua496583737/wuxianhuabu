/** @type {import('tailwindcss').Config} */
// T8-penguin-canvas Tailwind CSS 配置文件
// 定义自定义色板、字体和主题扩展
export default {
  // 扫描这些文件中的 class 名以生成对应的 CSS
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // 启用暗色模式支持，通过 class 方式切换
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // T8-penguin-canvas 自定义色板 (可后续完善)
        canvas: {
          dark: '#0a0a0b',   // 深色模式背景色
          light: '#fafafa',  // 浅色模式背景色
        },
      },
      fontFamily: {
        // 自定义字体栈，优先使用系统字体，兼容中英文
        sans: ['system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],  // 未使用额外插件
};
