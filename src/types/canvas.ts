/**
 * T8-penguin-canvas 节点类型定义模块
 * 与 features.json 节点清单严格对齐（24 节点 + 4 已弃）
 * 
 * 本文件定义了画布系统中所有节点的类型、分类和数据结构，
 * 是整个应用类型安全的基础。
 */

// ========== 节点类型定义（25 种保留 = 24 + upload）==========
// NodeType 联合类型定义了画布中所有可能的节点类型
// 分为 6 大类：Core(核心生成)、Special(特殊功能)、Utility(工具)、Auxiliary(辅助)、Toolbox(工具箱)、Input/Output(输入输出)
export type NodeType =
  // Core (8) - 核心生成节点：主要的 AI 生成能力节点
  | 'text'              // 文本节点：纯文本提示词输入
  | 'image'             // 图像生成节点：GPT Image 2 / Nano Banana 等图像生成模型
  | 'video'             // 视频生成节点：Veo 3.1 / Grok Video 等视频生成模型
  | 'seedance'          // Seedance 视频节点：Seedance 2.0 视频分镜生成
  | 'audio'             // 音频生成节点：Suno V5.5 音乐生成
  | 'llm'               // LLM 大语言模型节点：GPT-5 / Claude 4.5 / Gemini 2.5 等
  | 'runninghub'        // RunningHub 工作流节点：执行 RH 平台工作流
  | 'runninghub-wallet' // RunningHub 钱包应用节点：使用独立钱包的工作流
  | 'rh-config'         // RunningHub 配置节点：为 RH 工作流注入参数
  // Special (5) - 特殊功能节点：特定场景的专用节点
  | 'multi-angle-3d'    // 多角度 3D 视图节点：生成角色多视角图
  | 'panorama-720'      // 全景 720 度节点：生成全景图片
  | 'penguin-portrait'  // 企鹅肖像节点：专用肖像生成流程
  | 'portrait-metadata' // 肖像元数据节点：管理肖像生成参数
  | 'storyboard-grid'   // 故事板网格节点：分镜九宫格布局
  // Utility (9) - 工具节点：图像处理和数据流转工具
  | 'drawing-board'     // 画板节点：手绘/涂抹编辑
  | 'browser'           // 浏览器节点：网页内嵌预览
  | 'image-compare'     // 图像对比节点：前后对比展示
  | 'frame-extractor'   // 帧提取节点：从视频抽取帧
  | 'frame-pair'        // 帧配对节点：抽取首尾帧
  | 'loop'              // 循环器节点：批量处理多个素材
  | 'pick-from-set'     // 从合集获取节点：从集合中选择单个素材
  | 'resize'            // 调整大小节点：图像尺寸调整
  | 'combine'           // 合并节点：多图像拼接
  | 'remove-bg'          // 移除背景节点：AI 抠图
  | 'upscale'           // 超分辨率节点：图像放大增强
  | 'grid-crop'         // 网格裁剪节点：宫格切分图像
  // Auxiliary (5) - 辅助节点：创意和管理辅助
  | 'edit'              // 编辑节点：图像局部编辑
  | 'idea'              // 创意节点：灵感记录
  | 'bp'                // BP 节点：Blueprint 蓝图规划
  | 'relay'             // 中继节点：数据透传中转
  | 'video-output'      // 视频输出节点：视频结果展示
  // Toolbox (2) - 工具箱节点：参数调节工具
  | 'cinematic'         // 电影感节点：影视化效果参数
  | 'video-motion'      // 视频运动节点：运镜参数设置
  // Input/Output 素材 (2) - 上传素材 + 输出素材
  | 'upload'            // 上传素材节点（图像/视频/音频三合一）
  | 'output';           // 输出素材节点（文本/图像/视频/音频预览）

// ========== 节点分类 ==========
export type NodeCategory =
  | 'core'       // 核心生成
  | 'rh'         // RunningHub
  | 'special'    // 特殊功能
  | 'utility'    // 工具
  | 'auxiliary'  // 辅助
  | 'toolbox'    // 工具箱
  | 'input';     // 输入

// ========== 节点元数据接口（用于 Sidebar 展示）==========
export interface NodeMeta {
  type: NodeType;                              // 节点类型
  label: string;                               // 显示标签
  category: NodeCategory;                      // 所属分类
  description: string;                         // 描述说明
  icon: string;                                // lucide-react 图标名
  color: string;                               // tailwind 色阶
  /**
   * 是否在 UI 入口暂时隐藏（Sidebar 节点列表 + 端口拖出候选选择器）。
   * 节点本身仍然在 NODE_REGISTRY 中注册到 nodeTypes，
   * 以保证已存在画布数据加载与渲染兼容，
   * 仅从用户主动添加入口中移除。设为 true 即等价于「暂时不展示」。
   */
  hidden?: boolean;
}

// ========== 画布节点数据接口（xyflow Node.data）==========
export interface CanvasNodeData {
  label?: string;                                      // 节点标签
  prompt?: string;                                     // 提示词
  imageUrl?: string;                                   // 图像 URL
  videoUrl?: string;                                   // 视频 URL
  audioUrl?: string;                                   // 音频 URL
  model?: string;                                      // 模型名称
  status?: 'idle' | 'generating' | 'success' | 'error'; // 运行状态
  error?: string;                                      // 错误信息
  [key: string]: any;                                  // 通用扩展字段
}

// ========== 画布列表项接口（后端返回）==========
export interface CanvasListItem {
  id: string;        // 画布唯一 ID
  name: string;      // 画布名称
  nodeCount: number; // 节点数量
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

// ========== 画布完整数据接口 ==========
export interface CanvasData {
  nodes: any[];                                    // 节点数组
  edges: any[];                                    // 边数组
  viewport: { x: number; y: number; zoom: number }; // 视口状态
}

// ========== API Key 设置接口（对应后端 settings）==========
export interface ApiSettings {
  // 三套通用 Key
  zhenzhenApiKey: string;      // 贞贞工坊 API Key
  zhenzhenBaseUrl: string;     // 锁定 https://ai.t8star.org
  rhApiKey: string;            // RunningHub API Key
  rhBaseUrl: string;           // https://www.runninghub.cn
  llmApiKey: string;           // LLM API Key
  llmBaseUrl: string;          // 锁定 https://ai.t8star.org
  // 分类 API Key（留空时 fallback 到 zhenzhenApiKey）
  gptImageApiKey?: string;     // GPT-Image API Key
  nanoBananaApiKey?: string;   // Nano Banana API Key
  mjApiKey?: string;           // Midjourney API Key
  veoApiKey?: string;          // Veo API Key
  grokApiKey?: string;         // Grok API Key
  seedanceApiKey?: string;     // Seedance API Key
  sunoApiKey?: string;         // Suno API Key
  preferences?: {              // 偏好设置
    theme?: 'dark' | 'light';  // 主题模式
    language?: string;         // 语言设置
  };
}
