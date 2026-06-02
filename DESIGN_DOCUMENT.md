# T8-penguin-canvas 软件设计文档

## 1. 项目概述

### 1.1 项目名称
**T8-penguin-canvas（贞贞的无限画布 - 企鹅共创版）**

### 1.2 项目定位
一个面向 AI 创作的**节点式画布工作流工具**，支持：
- 拖拽节点、连线编排
- 生成图像/视频/音频
- 调用 LLM 大语言模型
- 串接 RunningHub 工作流
- 批量执行、智能对齐、打组功能
- 双主题切换（科技风/像素糖果风）
- Web 浏览器与 Electron 桌面端双形态

### 1.3 技术栈
| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 19 + TypeScript 5 + Vite 6 |
| 样式方案 | Tailwind CSS 3 + CSS Modules + 双主题系统 |
| 画布引擎 | @xyflow/react 12 (节点图核心) |
| 状态管理 | Zustand 5 (轻量级状态容器) |
| UI 图标 | lucide-react |
| 后端服务 | Node.js + Express |
| 图像处理 | sharp (图像缩放/裁剪/合并) |
| 文件上传 | multer ( multipart/form-data 解析) |
| 桌面端 | Electron 33 + electron-builder 25 |
| 代码加密 | bytenode 1.5 + T8ENC1 (自研 AES-256-CBC 二次加密) |
| AI 上游 | 贞贞工坊 / RunningHub / OpenAI 兼容 LLM |

---

## 2. 软件架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron 主进程                           │
│  (electron/main.cjs)                                            │
│  • 创建 BrowserWindow                                           │
│  • 拉起后端 Express 服务 (端口 18766)                              │
│  • IPC 通信桥接                                                 │
│  • 加载加密后端 (.t8c 字节码)                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │ IPC
┌───────────────────────▼─────────────────────────────────────────┐
│                      React 渲染进程                              │
│  (Vite Dev Server / 生产环境 dist)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    App.tsx (根组件)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Sidebar   │  │    Canvas   │  │  TerminalPanel  │  │   │
│  │  │  (侧边栏)    │  │  (画布主体)  │  │   (终端日志)     │  │   │
│  │  │             │  │             │  │                 │  │   │
│  │  │ - 画布管理  │  │ - 27 种节点   │  │ - 日志总线显示   │  │   │
│  │  │ - 节点列表  │  │ - xyflow 引擎 │  │ - 实时运行状态   │  │   │
│  │  │ - API 设置   │  │ - 连线逻辑   │  │                 │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP /api/* (端口 11422 → 18766 代理)
┌───────────────────────▼─────────────────────────────────────────┐
│                   Express 后端服务                               │
│  (backend/src/server.js - 端口 18766)                            │
│  ┌─────────────┬─────────────┬─────────────┬──────────────┐    │
│  │ canvas 路由  │ settings 路由│  proxy 路由  │ imageOps 路由 │    │
│  │             │             │             │              │    │
│  │ - 画布 CRUD  │ - API Key   │ - 上游代理  │ - 图像操作    │    │
│  │ - 元数据管理 │ - 分类 Key   │ - Key 脱敏   │ - sharp 处理  │    │
│  │ - 防空覆盖  │ - 持久化    │ - 结果转存  │ - 文件上传    │    │
│  └─────────────┴─────────────┴─────────────┴──────────────┘    │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────────┐
│                     外部 AI 服务                                  │
│  • 贞贞工坊 (https://ai.t8star.org)                              │
│    - GPT Image 2 / Nano Banana / Veo / Suno                     │
│  • RunningHub (https://www.runninghub.cn)                        │
│    - 工作流提交 / 轮询 / 资产上传                                │
│  • OpenAI 兼容 LLM                                               │
│    - GPT-5 / Claude 4.5 / Gemini 2.5                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
T8-penguin-canvas/
├── backend/                     # Express 后端（端口 18766）
│   ├── src/
│   │   ├── server.js            # 入口：挂载 5 类路由 + SPA 兜底
│   │   ├── config.js            # 端口/目录/上游 baseUrl 配置
│   │   └── routes/              # 业务路由
│   │       ├── canvas.js        # 画布 CRUD
│   │       ├── settings.js      # API Key 设置
│   │       ├── proxy.js         # 上游 API 代理
│   │       ├── files.js         # 文件上传/列表
│   │       └── imageOps.js      # 图像处理操作
│   └── utils/
│       └── whitePng.js          # 白 PNG 工具
│
├── src/                         # 前端源码
│   ├── App.tsx                  # 根组件：三栏布局 + 状态栏
│   ├── main.tsx                 # React 入口
│   │
│   ├── components/              # UI 组件
│   │   ├── Canvas.tsx           # 画布主体（xyflow 集成）
│   │   ├── CanvasToolbar.tsx    # 工具栏（运行/撤销/重做等）
│   │   ├── CanvasManager.tsx    # 画布管理器（导入/导出/模板）
│   │   ├── Sidebar.tsx          # 侧边栏（画布列表 + 节点面板）
│   │   ├── ApiSettings.tsx      # API Key 设置弹窗
│   │   ├── TerminalPanel.tsx    # 终端日志面板
│   │   ├── NodeActionBar.tsx    # 节点操作条
│   │   ├── MaterialDragOverlay.tsx  # 素材拖拽浮层
│   │   │
│   │   ├── nodes/               # 27 种节点组件
│   │   │   ├── TextNode.tsx     # 文本节点
│   │   │   ├── ImageNode.tsx    # 图像生成节点
│   │   │   ├── VideoNode.tsx    # 视频生成节点
│   │   │   ├── SeedanceNode.tsx # SD2.0 分镜节点
│   │   │   ├── AudioNode.tsx    # 音频生成节点
│   │   │   ├── LLMNode.tsx      # 大语言模型节点
│   │   │   ├── RunningHubNode.tsx  # RH 工作流节点
│   │   │   ├── LoopNode.tsx     # 循环器节点（v1.2.8）
│   │   │   ├── PickFromSetNode.tsx # 从合集获取节点
│   │   │   ├── UploadNode.tsx   # 上传素材节点
│   │   │   ├── OutputNode.tsx   # 输出预览节点
│   │   │   └── ... (共 27 种)
│   │   │
│   │   └── edges/
│   │       └── DeletableEdge.tsx # 可删除连线
│   │
│   ├── stores/                  # Zustand 状态管理
│   │   ├── canvas.ts            # 画布列表状态
│   │   ├── apiKeys.ts           # API Key 状态
│   │   ├── theme.ts             # 主题状态（明暗/风格）
│   │   ├── logs.ts              # 日志总线
│   │   ├── runBus.ts            # 运行总线（批量执行）
│   │   ├── groupBus.ts          # 组容器总线
│   │   └── dragMaterial.ts      # 跨节点素材拖拽
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useCanvasHistory.ts  # 撤销/重做历史栈
│   │   ├── useRunTrigger.ts     # 节点运行触发器
│   │   ├── useMaterialDragSource.ts # 拖拽源
│   │   └── useMaterialDropTarget.ts # 投放目标
│   │
│   ├── services/                # 服务层
│   │   ├── api.ts               # 后端 API 封装
│   │   ├── generation.ts        # 生成服务（图像/视频/音频）
│   │   └── imageOps.ts          # 图像操作服务
│   │
│   ├── config/                  # 配置文件
│   │   ├── nodeRegistry.ts      # 节点元数据注册表
│   │   ├── portTypes.ts         # 端口语义类型定义
│   │   └── canvasTemplates.ts   # 画布模板
│   │
│   ├── providers/               # 模型注册表
│   │   └── models.ts            # AI 模型定义
│   │
│   ├── utils/                   # 工具函数
│   │   ├── topologicalSort.ts   # Kahn 拓扑排序
│   │   └── wheelBlock.ts        # 滚轮阻止
│   │
│   └── types/                   # TypeScript 类型
│       └── canvas.ts            # 画布相关类型定义
│
├── electron/                    # Electron 主进程
│   ├── main.cjs                 # 主进程入口
│   ├── preload.cjs              # IPC 预加载脚本
│   ├── loader.cjs               # bytenode .jsc loader
│   ├── encrypt.cjs              # T8ENC1 加密脚本
│   └── _post_build.cjs          # 打包后置校验
│
├── features.json                # 节点清单锁 + 接口快照
├── skill.md                     # 项目能力速查
├── vite.config.ts               # Vite 配置（含/api 代理）
└── package.json                 # 项目依赖与脚本
```

---

## 3. 核心业务模块

### 3.1 画布管理模块

#### 3.1.1 职责
- 画布列表的增删改查
- 画布数据的序列化/反序列化
- 画布元数据（节点数、更新时间）维护
- 防空数据覆盖保护

#### 3.1.2 关键文件
- `src/stores/canvas.ts` - 画布状态管理
- `src/services/api.ts` - 画布 API 封装
- `backend/src/routes/canvas.js` - 画布 CRUD 路由

#### 3.1.3 数据结构
```typescript
interface CanvasListItem {
  id: string;          // 画布唯一标识
  name: string;        // 画布名称
  nodeCount: number;   // 节点数量
  createdAt: number;   // 创建时间戳
  updatedAt: number;   // 更新时间戳
}

interface CanvasData {
  nodes: any[];        // xyflow 节点数组
  edges: any[];        // xyflow 连线数组
  viewport: {          // 视口状态
    x: number;
    y: number;
    zoom: number;
  };
}
```

#### 3.1.4 业务流程
```
创建画布：
  用户点击"新建" 
    → CanvasStore.createCanvas()
      → POST /api/canvas {name}
        → 生成唯一 ID
        → 初始化空 nodes/edges/viewport
        → 写入 canvas_list.json
        → 返回 CanvasListItem

保存画布：
  用户 Ctrl+S / 自动保存
    → saveCanvasData(id, data)
      → PUT /api/canvas/:id {nodes, edges, viewport}
        → 防空检查（拒绝空数据覆盖非空画布）
        → 写入 canvas_{id}.json
        → 更新 canvas_list.json 中的 nodeCount/updatedAt

加载画布：
  用户选中画布
    → getCanvasData(id)
      → GET /api/canvas/:id
        → 读取 canvas_{id}.json
        → 返回完整 CanvasData
```

---

### 3.2 节点系统模块

#### 3.2.1 节点分类（27 种）

| 分组 | 节点类型 | 数量 | 说明 |
|------|----------|------|------|
| **素材资源** | upload, output | 2 | 上传素材/输出预览 |
| **核心节点** | text, image, video, seedance, audio, llm | 6 | AI 生成核心能力 |
| **RunningHub** | runninghub, runninghub-wallet, rh-config | 3 | RH 工作流集成 |
| **特殊节点** | multi-angle-3d, panorama-720, penguin-portrait, portrait-metadata, storyboard-grid | 5 | 专用流程（隐藏） |
| **工具节点** | drawing-board, browser, image-compare, frame-extractor, frame-pair, loop, pick-from-set, resize, combine, remove-bg, upscale, grid-crop | 12 | 图像处理工具 |
| **辅助节点** | edit, idea, bp, relay, video-output | 5 | 辅助功能 |
| **工具箱** | cinematic, video-motion | 2 | 影视化参数 |

#### 3.2.2 节点注册机制
```typescript
// src/config/nodeRegistry.ts
export const NODE_REGISTRY: NodeMeta[] = [
  { 
    type: 'image', 
    label: '图像', 
    category: 'core', 
    description: 'GPT Image 2 / Nano Banana Pro',
    icon: 'Image', 
    color: 'amber',
    hidden: false  // 控制是否在 Sidebar 显示
  },
  // ... 共 27 种
];

// Canvas.tsx 动态注册节点组件
const nodeTypes = NODE_REGISTRY.reduce((acc, m) => {
  acc[m.type] = SPECIFIC_NODES[m.type] || PlaceholderNode;
  return acc;
}, {});
```

#### 3.2.3 端口语义系统
```typescript
// src/config/portTypes.ts
export type PortType = 'text' | 'image' | 'video' | 'audio' | 'metadata' | 'config' | 'any';

export const NODE_PORTS: Record<string, NodePorts> = {
  text: { inputs: [], outputs: ['text'] },
  image: { inputs: ['text', 'image'], outputs: ['image'] },
  video: { inputs: ['text', 'image'], outputs: ['video'] },
  seedance: { inputs: ['text', 'image', 'video', 'audio'], outputs: ['video'] },
  relay: { inputs: ['any'], outputs: ['any'] },  // 透传
  // ...
};

// 连接校验逻辑
function isConnectionValid(source, target): boolean {
  if (source.id === target.id) return false;  // 禁止自连
  if (source.type === 'loop' && target.type === 'output') return false;  // 禁止循环器直连输出
  
  const sOut = getNodeOutputs(source);
  const tIn = getNodeInputs(target);
  
  // any 类型可与任意类型互通
  if (sOut.includes('any') || tIn.includes('any')) return true;
  
  // 取交集判断兼容性
  return sOut.some(t => tIn.includes(t));
}
```

---

### 3.3 批量执行模块

#### 3.3.1 执行流程
```
用户点击 ▶ 批量运行
  ↓
Canvas.tsx 收集所有可执行节点
  ↓
topologicalSort() Kahn 拓扑排序
  ↓
串行遍历排序结果
  ↓
对每个节点：
  triggerRun(nodeId, 'batch')
    → useRunTrigger 监听 currentRunId/runningIds
    → 节点执行 runFn
    → markDone(nodeId, ok)
  ↓
等待 lastDone.id === nodeId
  ↓
推进下一个节点
```

#### 3.3.2 可执行节点集合
```typescript
const EXECUTABLE_NODE_TYPES = new Set([
  'image', 'edit',
  'multi-angle-3d', 'panorama-720', 'penguin-portrait',
  'video', 'seedance', 'audio', 'llm', 
  'runninghub', 'runninghub-wallet',
  'resize', 'upscale', 'grid-crop', 'remove-bg', 'combine',
  'frame-extractor', 'frame-pair',
  'upload',  // 特殊：根据已上传素材创建下游 OutputNode
  'loop', 'pick-from-set'  // v1.2.8 新增
]);
```

#### 3.3.3 运行总线设计
```typescript
// src/stores/runBus.ts
interface RunBusState {
  currentRunId: string | null;      // 单点模式当前运行节点
  runningIds: string[];             // 并发运行节点集合（v1.2.8）
  lastDone: { id: string; ok: boolean; ts: number } | null;
  mode: 'idle' | 'single' | 'batch';
  batchTotal: number;
  batchDoneCount: number;
  
  triggerRun: (id, mode) => void;       // 单点触发
  triggerRunMany: (ids, mode) => void;  // 并发触发（循环器用）
  markDone: (id, ok, error?) => void;   // 标记完成
  cancelAll: () => void;                // 取消全部
}
```

#### 3.3.4 循环器特殊逻辑
```typescript
// LoopNode.tsx 并联模式伪代码
async function runParallel(items, downstreamChain) {
  const clones = [];
  
  // 1. 克隆 (N-1) 份下游子图
  for (let i = 1; i < items.length; i++) {
    const clone = cloneSubgraph(downstreamChain);
    clones.push(clone);
  }
  
  // 2. 为每条链创建 supplier upload 节点
  const allChains = [originalChain, ...clones];
  allChains.forEach((chain, idx) => {
    injectMaterial(chain.head, items[idx]);
  });
  
  // 3. 并发触发所有链
  const allHeadIds = allChains.map(c => c.head.id);
  triggerRunMany(allHeadIds);
  
  // 4. 等待所有完成
  const results = await Promise.all(
    allHeadIds.map(id => awaitNode(id, cancelRef))
  );
  
  // 5. 聚合产物
  return aggregateResults(allChains);
}
```

---

### 3.4 API Key 管理模块

#### 3.4.1 Key 分类
| Key 类型 | 用途 | Base URL | 是否独立 |
|----------|------|----------|----------|
| 贞贞工坊 API Key | image/video/audio | https://ai.t8star.org | 通用 |
| LLM 独立 API Key | llm/vision | https://ai.t8star.org | 独立 |
| RunningHub API Key | RH 工作流 | https://www.runninghub.cn | 独立 |
| gptImageApiKey | GPT Image 专属 | fallback 到通用 | 分类 |
| nanoBananaApiKey | Nano Banana 专属 | fallback 到通用 | 分类 |
| mjApiKey | Midjourney 专属 | fallback 到通用 | 分类 |
| veoApiKey | Veo 专属 | fallback 到通用 | 分类 |
| grokApiKey | Grok 专属 | fallback 到通用 | 分类 |
| seedanceApiKey | Seedance 专属 | fallback 到通用 | 分类 |
| sunoApiKey | Suno 专属 | fallback 到通用 | 分类 |

#### 3.4.2 安全机制
```
前端永远拿不到明文 Key：
  1. 用户输入 Key → POST /api/settings
  2. 后端保存到 settings.json（明文）
  3. GET /api/settings 返回脱敏值（****xxxx）
  4. 代理请求时后端从 settings.json 读取明文注入 Header
  
分类 Key 选择逻辑：
  function pickApiKey(settings, hint) {
    if (hint.includes('suno')) return settings.sunoApiKey || settings.zhenzhenApiKey;
    if (hint.includes('veo')) return settings.veoApiKey || settings.zhenzhenApiKey;
    // ...
    return settings.zhenzhenApiKey;  // fallback
  }
```

---

### 3.5 跨节点素材拖拽模块

#### 3.5.1 交互流程
```
用户在节点 A 内按住 Ctrl+ 左键拖动素材缩略图
  ↓
useMaterialDragSource 检测到 Ctrl 键
  ↓
e.stopPropagation() 阻止 ReactFlow 节点拖动
  ↓
dragMaterialStore.start(payload, clientX, clientY)
  ↓
MaterialDragOverlay 渲染跟随鼠标的幽灵浮层
  ↓
鼠标移动时：
  elementFromPoint 命中目标节点 B
  ↓
检查 B 的 data-drop-kinds 是否包含 payload.kind
  ↓
释放鼠标：
  dispatch CustomEvent('penguin:material-drop')
  ↓
节点 B 的 useMaterialDropTarget 监听事件
  ↓
onDrop(payload) 处理素材
```

#### 3.5.2 核心状态
```typescript
// src/stores/dragMaterial.ts
interface DragMaterialState {
  dragging: boolean;
  payload: {
    kind: 'image' | 'video' | 'audio' | 'text';
    url?: string;
    text?: string;
    sourceNodeId?: string;  // 来源节点（用于自我屏蔽）
    previewUrl?: string;
  } | null;
  clientX: number;
  clientY: number;
  hoverTargetId: string | null;  // 当前命中目标
  hoverAccepts: boolean;         // 目标是否接受该类型
  
  start: (payload, x, y) => void;
  move: (x, y, targetId, accepts) => void;
  end: () => void;
}
```

---

### 3.6 主题系统模块

#### 3.6.1 主题维度
```typescript
type CanvasTheme = 'dark' | 'light';   // 明暗模式
type ThemeStyle = 'tech' | 'pixel';    // 视觉风格

// 默认联动规则：
// tech → dark
// pixel → light
// 用户可手动覆盖
```

#### 3.6.2 持久化
```typescript
// src/stores/theme.ts
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      style: 'pixel',
      toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      toggleStyle: () => set(s => {
        const next = s.style === 'tech' ? 'pixel' : 'tech';
        return { style: next, theme: next === 'pixel' ? 'light' : 'dark' };
      }),
    }),
    { name: 't8-canvas-theme' }  // localStorage key
  )
);
```

---

### 3.7 撤销/重做模块

#### 3.7.1 历史栈设计
```typescript
// src/hooks/useCanvasHistory.ts
const MAX_HISTORY = 50;

interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
}

class HistoryManager {
  past: CanvasSnapshot[] = [];      // 过去栈
  future: CanvasSnapshot[] = [];    // 未来栈
  last: CanvasSnapshot | null = null; // 当前快照
  
  capture(snap: CanvasSnapshot) {
    if (noChange(snap, this.last)) return;
    this.past.push(clone(this.last));
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.last = clone(snap);
    this.future = [];  // 清空未来栈
  }
  
  undo() {
    if (this.past.length === 0) return;
    this.future.push(clone(this.last));
    this.last = this.past.pop();
    applySnapshot(this.last);
  }
  
  redo() {
    if (this.future.length === 0) return;
    this.past.push(clone(this.last));
    this.last = this.future.pop();
    applySnapshot(this.last);
  }
}
```

#### 3.7.2 捕获时机
- 节点拖拽结束（onSelectionEnd / onNodesChange）
- 连线创建/删除（onConnect / onEdgesChange）
- 节点内容修改（防抖 500ms）
- 批量操作前手动 capture()

---

### 3.8 组容器（GroupBox）模块

#### 3.8.1 打组流程
```
用户框选 ≥2 节点
  ↓
右键菜单选择"打组" / 自动弹出操作面板
  ↓
Canvas.tsx 创建 GroupBoxNode：
  - 计算包围盒位置/尺寸
  - 分配随机颜色（12 色调色板）
  - 记录 memberIds
  ↓
将成员节点 parentId 设为 groupId
  ↓
ReactFlow 自动处理层级渲染
```

#### 3.8.2 组执行逻辑
```
用户点击组内"执行"按钮
  ↓
GroupBusStore.requestExecute(groupId, memberIds)
  ↓
Canvas.tsx 订阅 executeReq 变化
  ↓
对 memberIds 做拓扑排序
  ↓
串行触发每个成员节点
  ↓
组内进度可视化
```

---

## 4. 类/组件关系图

### 4.1 前端组件层次

```
App.tsx (根组件)
│
├── Sidebar.tsx
│   ├── CanvasManager.tsx (画布管理)
│   │   └── 画布列表项（新建/重命名/删除/导入/导出）
│   └── 节点列表面板（按分类折叠）
│       └── 节点卡片（拖拽添加到画布）
│
├── Canvas.tsx (画布主体)
│   ├── ReactFlow (xyflow 引擎)
│   │   ├── nodeTypes[27 种节点组件]
│   │   │   ├── TextNode
│   │   │   ├── ImageNode
│   │   │   ├── VideoNode
│   │   │   ├── ... (共 27 种)
│   │   │   └── GroupBoxNode (组容器)
│   │   ├── edgeTypes[DeletableEdge]
│   │   ├── Background (网格背景)
│   │   ├── Controls (缩放/平移控制条)
│   │   └── MiniMap (迷你地图)
│   ├── CanvasToolbar.tsx (工具栏)
│   │   └── 按钮：运行/撤销/重做/复制/粘贴/删除/导入/导出/模板
│   ├── NodeActionBar.tsx (节点操作条)
│   └── MaterialDragOverlay.tsx (素材拖拽浮层)
│
├── TerminalPanel.tsx (终端日志)
│   └── 日志条目列表（按级别着色）
│
└── ApiSettings.tsx (API Key 设置弹窗)
    └── 表单：10 个 Key 输入框 + 保存按钮
```

### 4.2 Store 依赖关系

```
┌─────────────────┐
│  useThemeStore  │ ← 独立（无依赖）
│  (主题状态)      │
└─────────────────┘

┌─────────────────┐
│ useApiKeysStore │ ← 依赖 api.ts
│  (API Key 状态)   │
└─────────────────┘

┌─────────────────┐
│  useCanvasStore │ ← 依赖 api.ts
│  (画布列表状态)   │
└─────────────────┘

┌─────────────────┐
│   useLogStore   │ ← 独立（日志总线）
│  (日志状态)      │
└─────────────────┘
         ↑
         │ logBus.log() 被各节点调用

┌─────────────────┐
│  useRunBusStore │ ← 独立（运行总线）
│  (批量执行状态)   │
└─────────────────┘
         ↑
         │ useRunTrigger 监听

┌───────────────────┐
│  useGroupBusStore │ ← 独立（组容器总线）
│  (组操作请求)      │
└───────────────────┘

┌─────────────────────┐
│ useDragMaterialStore│ ← 独立（素材拖拽）
│  (拖拽状态)          │
└─────────────────────┘
         ↑
         │ useMaterialDragSource / useMaterialDropTarget 使用
```

### 4.3 后端路由层次

```
Express App (server.js)
│
├── CORS 中间件
├── JSON 解析中间件 (limit: 50mb)
├── 访问日志中间件
│
├── 静态资源
│   ├── /files/output → OUTPUT_DIR
│   ├── /files/input → INPUT_DIR
│   └── /files/thumbnails → THUMBNAILS_DIR
│
├── /api/status (健康检查)
│
├── /api/canvas/* (canvasRouter)
│   ├── GET    /              → 列表
│   ├── POST   /              → 创建
│   ├── GET    /:id           → 获取单个
│   ├── PUT    /:id           → 更新
│   ├── DELETE /:id           → 删除
│   └── PATCH  /:id/name      → 重命名
│
├── /api/settings/* (settingsRouter)
│   ├── GET    /              → 获取 (脱敏)
│   ├── GET    /raw           → 获取 (明文，内部用)
│   └── POST   /              → 更新
│
├── /api/proxy/* (proxyRouter)
│   ├── POST   /image         → 图像生成
│   ├── POST   /image/submit  → 异步提交
│   ├── GET    /image/status/:taskId → 轮询
│   ├── POST   /video/submit  → 视频提交
│   ├── GET    /video/query/:taskId  → 视频轮询
│   ├── POST   /audio/submit  → 音频提交
│   ├── GET    /audio/query/:taskId  → 音频轮询
│   └── /runninghub/*         → RH 工作流代理
│
├── /api/files/* (filesRouter)
│   ├── POST   /upload        → 文件上传
│   ├── POST   /upload-base64 → base64 上传
│   └── GET    /list          → 文件列表
│
└── /api/image/* (imageOpsRouter)
    ├── POST   /resize        → 尺寸调整
    ├── POST   /upscale       → 放大
    ├── POST   /grid-crop     → 宫格剪裁
    ├── POST   /combine       → 合并
    ├── POST   /remove-bg     → 抠图
    └── POST   /frame-extract → 抽帧
```

---

## 5. 详细业务逻辑

### 5.1 图像生成流程（以 ImageNode 为例）

```typescript
// 1. 用户配置参数
const config = {
  model: 'gpt-image-2',
  aspectRatio: '16:9',
  sizeLevel: '2K',
  prompt: '一只可爱的企鹅',
  referenceImages: ['/files/input/ref1.png']
};

// 2. 点击运行按钮
handleRun = async () => {
  update({ status: 'generating' });
  logBus.info('开始生成图像', `image:${id}`);
  
  try {
    // 3. 调用生成服务
    const result = await generateImage({
      model: config.model,
      paramKind: 'gpt-size',
      prompt: config.prompt,
      aspect_ratio: config.aspectRatio,
      image_size: config.sizeLevel,
      images: config.referenceImages
    });
    
    // 4. 更新节点状态
    update({
      status: 'success',
      imageUrl: result.urls[0],
      raw: result.raw
    });
    
    logBus.success('图像生成成功', `image:${id}`);
    
  } catch (error) {
    update({ status: 'error', error: error.message });
    logBus.error(`生成失败：${error.message}`, `image:${id}`);
  }
};
```

### 5.2 上游代理自动转存

```javascript
// backend/src/routes/proxy.js

// 工具函数：保存远程图像到本地
async function saveRemoteImage(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const ext = url.match(/\.(png|jpe?g|webp|gif)/i)?.[1] || 'png';
  const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const filePath = path.join(config.OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(buf));
  return `/files/output/${filename}`;  // 返回本地 URL
}

// 图像生成响应处理
router.post('/image', async (req, res) => {
  const settings = loadRawSettings();
  applyClassifiedKey(settings, req.body.model);
  
  // 调用上游 API
  const upstreamRes = await fetch(`${settings.zhenzhenBaseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.zhenzhenApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });
  
  const upstreamData = await upstreamRes.json();
  
  // 自动转存图像
  const localUrls = [];
  for (const img of upstreamData.data) {
    if (img.url) {
      const localUrl = await saveRemoteImage(img.url);
      localUrls.push(localUrl);
    } else if (img.b64_json) {
      const localUrl = saveBase64Image(img.b64_json);
      localUrls.push(localUrl);
    }
  }
  
  res.json({
    success: true,
    data: { urls: localUrls, raw: upstreamData }
  });
});
```

### 5.3 拓扑排序算法

```typescript
// src/utils/topologicalSort.ts

/**
 * Kahn 算法实现拓扑排序
 * @param nodes 所有节点
 * @param edges 所有连线
 * @param executableTypes 可执行节点类型集合
 * @returns 排序后的节点 ID 数组
 */
export function topologicalSort(nodes, edges, executableTypes): string[] {
  // 1. 过滤出可执行节点
  const exeNodes = nodes.filter(n => executableTypes.has(n.type));
  const exeIds = new Set(exeNodes.map(n => n.id));
  
  // 2. 构建邻接表和入度表
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  exeIds.forEach(id => {
    inDegree.set(id, 0);
    adj.set(id, []);
  });
  
  // 3. 仅保留两端都是可执行节点的边
  for (const e of edges) {
    if (exeIds.has(e.source) && exeIds.has(e.target) && e.source !== e.target) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }
  
  // 4. 初始化队列（入度为 0 的节点）
  const queue: string[] = [];
  for (const n of exeNodes) {
    if ((inDegree.get(n.id) || 0) === 0) queue.push(n.id);
  }
  
  // 5. Kahn 主循环
  const result: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    
    for (const next of adj.get(id) || []) {
      const d = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  
  // 6. 处理环或异常（剩余节点按原序追加）
  if (result.length < exeIds.size) {
    const got = new Set(result);
    for (const n of exeNodes) {
      if (!got.has(n.id)) result.push(n.id);
    }
  }
  
  return result;
}
```

---

## 6. 数据持久化

### 6.1 文件系统结构

```
data/                          # 数据持久化目录
├── canvas_list.json           # 画布元数据列表
├── canvas_{id}.json           # 单个画布完整数据
├── settings.json              # API Key 设置
└── rh_apps.json               # RH 应用缓存

input/                         # 用户上传素材
├── file_{timestamp}_{rand}.png
└── ...

output/                        # 生成产物
├── img_{timestamp}_{rand}.png
├── video_{timestamp}_{rand}.mp4
└── audio_{timestamp}_{rand}.mp3

thumbnails/                    # 缩略图缓存
└── thumb_{timestamp}_{rand}.jpg
```

### 6.2 数据文件格式

**canvas_list.json**
```json
[
  {
    "id": "canvas-1732000000000-abc123",
    "name": "我的第一个工作流",
    "nodeCount": 5,
    "createdAt": 1732000000000,
    "updatedAt": 1732100000000
  }
]
```

**canvas_{id}.json**
```json
{
  "nodes": [
    {
      "id": "text-1",
      "type": "text",
      "position": { "x": 100, "y": 100 },
      "data": {
        "prompt": "一只可爱的企鹅",
        "label": "文本"
      }
    },
    {
      "id": "image-1",
      "type": "image",
      "position": { "x": 400, "y": 100 },
      "data": {
        "model": "gpt-image-2",
        "aspectRatio": "16:9",
        "status": "success",
        "imageUrl": "/files/output/img_1732100000_abc.png"
      }
    }
  ],
  "edges": [
    {
      "id": "reactflow__edge-text-1-source-image-1-target",
      "source": "text-1",
      "target": "image-1",
      "sourceHandle": null,
      "targetHandle": null
    }
  ],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

**settings.json**
```json
{
  "zhenzhenApiKey": "sk-xxxxxxxx",
  "zhenzhenBaseUrl": "https://ai.t8star.org",
  "rhApiKey": "rh_xxxxxxxx",
  "rhBaseUrl": "https://www.runninghub.cn",
  "llmApiKey": "sk-xxxxxxxx",
  "llmBaseUrl": "https://ai.t8star.org",
  "gptImageApiKey": "",
  "nanoBananaApiKey": "",
  "mjApiKey": "",
  "veoApiKey": "",
  "grokApiKey": "",
  "seedanceApiKey": "",
  "sunoApiKey": "",
  "preferences": {
    "theme": "dark",
    "language": "zh-CN"
  }
}
```

---

## 7. 关键技术点

### 7.1 ReactFlow 集成要点

```typescript
// Canvas.tsx 核心配置

const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

const onConnect = useCallback(
  (params) => {
    // 连接前校验
    const source = getNode(params.source);
    const target = getNode(params.target);
    if (!isConnectionValid(source, target)) {
      logBus.warn('连接被拒绝：端口类型不匹配');
      return;
    }
    setEdges(eds => addEdge({...params, type: 'deletable'}, eds));
    history.capture({ nodes, edges: [...edges, params] });
  },
  [getNode, setEdges]
);

const isValidConnection = useCallback(
  (connection) => {
    const source = getNode(connection.source);
    const target = getNode(connection.target);
    return isConnectionValid(source, target);
  },
  [getNode]
);

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={handleNodesChange}  // 包含撤销捕获
  onEdgesChange={handleEdgesChange}
  onConnect={onConnect}
  isValidConnection={isValidConnection}
  nodeTypes={nodeTypes}
  edgeTypes={{ deletable: DeletableEdge }}
  snapToGrid={snapEnabled}
  snapGrid={SNAP_GRID}
  selectionMode={SelectionMode.Partial}  // 部分框选
  deleteKeyCode={['Delete', 'Backspace']}
  fitView
>
  <Background variant={BackgroundVariant.Dots} />
  <Controls />
  <MiniMap />
</ReactFlow>
```

### 7.2 Zustand 状态管理最佳实践

```typescript
// 基础 Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface State {
  count: number;
  increment: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }),
    { name: 'my-store' }
  )
);

// 组件中使用
const count = useStore((s) => s.count);
const increment = useStore((s) => s.increment);

// 选择器优化：避免不必要的重渲染
const expensiveValue = useStore(useShallow((s) => computeExpensive(s.data)));
```

### 7.3 Electron 打包流程

```bash
# 1. 构建前端
npm run build  # tsc -b && vite build → dist/

# 2. 加密后端
npm run encrypt
# bytenode 编译 backend/src/**/*.js → .jsc
# T8ENC1 二次加密 → .t8c

# 3. Electron Builder 打包
npm run dist
# electron-builder --win --x64
# 生成 dist_electron/T8-PenguinCanvas-Setup-<version>.exe

# 4. 后置校验
node electron/_post_build.cjs
# 校验 7 个.t8c + 前端 dist 完整性
```

---

## 8. 扩展性设计

### 8.1 新增节点类型 SOP

1. **在 `features.json` 中登记节点**
2. **在 `src/types/canvas.ts` 中添加 NodeType**
3. **在 `src/config/nodeRegistry.ts` 中注册元数据**
4. **在 `src/config/portTypes.ts` 中定义端口**
5. **创建 `src/components/nodes/NewNode.tsx`**
6. **在 `Canvas.tsx` 的 SPECIFIC_NODES 中映射**
7. **在 `INITIAL_DATA` 中定义初始 data**
8. **如需执行，加入 `EXECUTABLE_NODE_TYPES`**

### 8.2 新增 AI 服务商

1. **在 `backend/src/config.js` 中添加 baseUrl**
2. **在 `src/types/canvas.ts` 的 ApiSettings 中添加 Key 字段**
3. **在 `backend/src/routes/settings.js` 的 DEFAULT_SETTINGS 中添加**
4. **在 `backend/src/routes/proxy.js` 中实现代理逻辑**
5. **在 `src/services/generation.ts` 中添加客户端封装**

---

## 9. 性能优化

### 9.1 前端优化
- **Memoization**: 节点组件使用 `React.memo()`
- **虚拟滚动**: 大量节点时使用 xyflow 内置虚拟化
- **防抖**: 节点内容修改 500ms 防抖保存
- **选择器优化**: Zustand 使用 `useShallow` 避免过度订阅

### 9.2 后端优化
- **流式响应**: LLM 对话支持 stream 模式
- **并发限制**: 文件上传限制 50MB
- **缓存**: RH 应用信息缓存到 rh_apps.json

### 9.3 打包优化
- **代码分割**: Vite 自动 code splitting
- **Tree Shaking**: ES Module 自动摇树
- **压缩**: Terser 压缩 + Gzip

---

## 10. 安全考虑

### 10.1 API Key 保护
- 前端永不接触明文 Key
- 后端 settings.json 文件权限 600
- 生产环境建议加密存储

### 10.2 数据安全
- 防空数据覆盖（双层校验）
- 输入验证（文件大小/类型）
- CORS 限制（开发环境放宽）

### 10.3 代码保护
- bytenode 字节码编译
- T8ENC1 二次加密
- ASAR 打包防篡改

---

## 11. 总结

T8-penguin-canvas 是一个架构清晰、功能丰富的 AI 节点画布工作流工具。其核心设计原则包括：

1. **模块化**: 前后端分离，各模块职责明确
2. **可扩展**: 节点注册机制支持快速新增
3. **安全性**: API Key 脱敏、数据持久化保护
4. **用户体验**: 双主题、智能对齐、批量执行
5. **跨平台**: Web + Electron 双形态部署

项目采用现代化的技术栈（React 19 + TypeScript 5 + Electron 33），结合成熟的开源库（xyflow + zustand），实现了复杂的节点编排和 AI 工作流管理能力。
