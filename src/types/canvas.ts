/**
 * T8-penguin-canvas 节点类型定义
 * 与 features.json 节点清单严格对齐 (24 节点 + 4 已弃)
 * 
 * 本文件定义了画布系统中所有节点的类型、分类、元数据接口以及数据结构
 * 是整个应用的核心类型定义文件，确保前后端数据类型一致性
 */

// ============================================================================
// 节点类型定义 (共 25 种保留类型 = 24 基础节点 + upload 上传节点)
// ============================================================================

/**
 * NodeType - 节点类型联合类型
 * 定义了画布中所有可能的节点类型，分为 7 大类：
 * 
 * Core (8 种) - 核心生成类节点：
 *   - text: 文本生成节点
 *   - image: 图像生成节点
 *   - video: 视频生成节点
 *   - seedance: Seedance 舞蹈生成节点
 *   - audio: 音频生成节点
 *   - llm: 大语言模型节点
 *   - runninghub: RunningHub 平台节点
 *   - runninghub-wallet: RunningHub 钱包节点
 *   - rh-config: RunningHub 配置节点
 * 
 * Special (5 种) - 特殊功能节点：
 *   - multi-angle-3d: 3D 多角度视图节点
 *   - panorama-720: 720 度全景图节点
 *   - penguin-portrait: 企鹅肖像节点
 *   - portrait-metadata: 肖像元数据节点
 *   - storyboard-grid: 故事板网格节点
 * 
 * Utility (12 种) - 工具类节点：
 *   - drawing-board: 绘图板节点
 *   - browser: 浏览器节点
 *   - image-compare: 图像对比节点
 *   - frame-extractor: 帧提取节点
 *   - frame-pair: 帧配对节点
 *   - loop: 循环器节点（支持串联/并联模式）
 *   - pick-from-set: 集合选择节点
 *   - resize: 图像缩放节点
 *   - combine: 图像合成节点
 *   - remove-bg: 背景移除节点
 *   - upscale: 图像超分辨率节点
 *   - grid-crop: 网格裁剪节点
 * 
 * Auxiliary (5 种) - 辅助类节点：
 *   - edit: 编辑节点
 *   - idea: 创意灵感节点
 *   - bp: 商业计划节点
 *   - relay: 中继节点（用于信号传递）
 *   - video-output: 视频输出节点
 * 
 * Toolbox (2 种) - 工具箱节点：
 *   - cinematic: 电影效果节点
 *   - video-motion: 视频运动节点
 * 
 * Input/Output (2 种) - 输入输出素材节点：
 *   - upload: 上传素材节点（图像/视频/音频三合一）
 *   - output: 输出素材节点（文本/图像/视频/音频预览）
 */
export type NodeType =
  // Core (8) - 核心生成类节点
  | 'text'
  | 'image'
  | 'video'
  | 'seedance'
  | 'audio'
  | 'llm'
  | 'runninghub'
  | 'runninghub-wallet'
  | 'rh-config'
  // Special (5) - 特殊功能节点
  | 'multi-angle-3d'
  | 'panorama-720'
  | 'penguin-portrait'
  | 'portrait-metadata'
  | 'storyboard-grid'
  // Utility (12) - 工具类节点
  | 'drawing-board'
  | 'browser'
  | 'image-compare'
  | 'frame-extractor'
  | 'frame-pair'
  | 'loop'
  | 'pick-from-set'
  | 'resize'
  | 'combine'
  | 'remove-bg'
  | 'upscale'
  | 'grid-crop'
  // Auxiliary (5) - 辅助类节点
  | 'edit'
  | 'idea'
  | 'bp'
  | 'relay'
  | 'video-output'
  // Toolbox (2) - 工具箱节点
  | 'cinematic'
  | 'video-motion'
  // Input/Output 素材 (2) - 上传素材 (图像/视频/音频三合一) + 输出素材 (文本/图像/视频/音频预览)
  | 'upload'
  | 'output';

// ============================================================================
// 节点分类定义
// ============================================================================

/**
 * NodeCategory - 节点分类联合类型
 * 用于对节点进行分组管理，主要应用于 Sidebar 侧边栏的节点列表展示
 * 
 * - core: 核心生成类节点（文本/图像/视频/AI 模型等）
 * - rh: RunningHub 相关节点
 * - special: 特殊功能节点（3D/全景/肖像等）
 * - utility: 工具类节点（图像处理/帧操作等）
 * - auxiliary: 辅助类节点（创意/中继等）
 * - toolbox: 工具箱节点（特效类）
 * - input: 输入输出类节点
 */
export type NodeCategory =
  | 'core'
  | 'rh'
  | 'special'
  | 'utility'
  | 'auxiliary'
  | 'toolbox'
  | 'input';

// ============================================================================
// 节点元数据接口
// ============================================================================

/**
 * NodeMeta - 节点元数据接口
 * 用于在 Sidebar 侧边栏中展示节点信息，包含节点的展示属性和行为控制
 * 
 * @property type - 节点类型，对应 NodeType 联合类型中的具体类型
 * @property label - 节点显示标签，用于 UI 展示
 * @property category - 节点所属分类，用于 Sidebar 分组展示
 * @property description - 节点功能描述，帮助用户理解节点用途
 * @property icon - Lucide React 图标名称，用于节点图标展示
 * @property color - Tailwind CSS 色阶类名，用于节点视觉区分
 * @property hidden - 是否在 UI 入口隐藏（可选），设为 true 时从 Sidebar 和端口拖出候选选择器中隐藏，
 *                   但节点本身仍在 NODE_REGISTRY 中注册，保证已存在画布数据加载与渲染兼容
 */
export interface NodeMeta {
  type: NodeType;
  label: string;
  category: NodeCategory;
  description: string;
  icon: string; // lucide-react 图标名
  color: string; // tailwind 色阶
  /**
   * 是否在 UI 入口暂时隐藏 (Sidebar 节点列表 + 端口拖出候选选择器)。
   * 节点本身仍然在 NODE_REGISTRY 中注册到 nodeTypes，以保证已存在画布数据加载与渲染兼容，
   * 仅从用户主动添加入口中移除。设为 true 即等价于「暂时不展示」。
   */
  hidden?: boolean;
}

// ============================================================================
// 画布节点数据接口
// ============================================================================

/**
 * CanvasNodeData - 画布节点数据接口
 * 对应 xyflow (ReactFlow) 库中 Node.data 的数据结构
 * 定义了节点在画布上的运行时状态和数据属性
 * 
 * @property label - 节点显示标签
 * @property prompt - AI 生成提示词（用于生成类节点）
 * @property imageUrl - 图像资源 URL（用于图像相关节点）
 * @property videoUrl - 视频资源 URL（用于视频相关节点）
 * @property audioUrl - 音频资源 URL（用于音频相关节点）
 * @property model - 使用的 AI 模型标识
 * @property status - 节点执行状态：idle(空闲)/generating(生成中)/success(成功)/error(错误)
 * @property error - 错误信息（当 status 为 error 时填充）
 * @property [key: string] - 通用扩展字段，支持各节点类型自定义属性
 */
export interface CanvasNodeData {
  label?: string;
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  model?: string;
  status?: 'idle' | 'generating' | 'success' | 'error';
  error?: string;
  // 通用扩展字段，支持各节点类型自定义属性
  [key: string]: any;
}

// ============================================================================
// 画布列表项接口
// ============================================================================

/**
 * CanvasListItem - 画布列表项接口
 * 对应后端返回的画布列表数据结构，用于画布管理界面的展示
 * 
 * @property id - 画布唯一标识符
 * @property name - 画布名称
 * @property nodeCount - 画布中节点数量
 * @property createdAt - 创建时间戳（毫秒）
 * @property updatedAt - 最后更新时间戳（毫秒）
 */
export interface CanvasListItem {
  id: string;
  name: string;
  nodeCount: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// 画布完整数据接口
// ============================================================================

/**
 * CanvasData - 画布完整数据接口
 * 保存和加载画布时的完整数据结构，包含节点、连线和视口状态
 * 
 * @property nodes - 节点数组，包含画布上所有节点的完整数据
 * @property edges - 连线数组，包含节点间的所有连接关系
 * @property viewport - 视口状态，包含平移坐标 (x,y) 和缩放比例 (zoom)
 */
export interface CanvasData {
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
}

// ============================================================================
// API Key 设置接口
// ============================================================================

/**
 * ApiSettings - API Key 设置接口
 * 对应后端 settings 接口的数据结构，管理所有 AI 服务的 API 密钥配置
 * 
 * 通用 Key（三套）：
 * - zhenzhenApiKey/zhenzhenBaseUrl: 真真 API（锁定 https://ai.t8star.org）
 * - rhApiKey/rhBaseUrl: RunningHub API（https://www.runninghub.cn）
 * - llmApiKey/llmBaseUrl: 大语言模型 API（锁定 https://ai.t8star.org）
 * 
 * 分类 API Key（留空时 fallback 到 zhenzhenApiKey）：
 * - gptImageApiKey: GPT 图像生成 API Key
 * - nanoBananaApiKey: NanoBanana API Key
 * - mjApiKey: Midjourney API Key
 * - veoApiKey: Google Veo API Key
 * - grokApiKey: Grok API Key
 * - seedanceApiKey: Seedance API Key
 * - sunoApiKey: Suno 音乐生成 API Key
 * 
 * @property preferences - 用户偏好设置（可选）
 * @property preferences.theme - 主题偏好：dark(暗色)/light(亮色)
 * @property preferences.language - 语言偏好
 */
export interface ApiSettings {
  // 三套通用 Key
  zhenzhenApiKey: string;
  zhenzhenBaseUrl: string; // 锁定 https://ai.t8star.org
  rhApiKey: string;
  rhBaseUrl: string; // https://www.runninghub.cn
  llmApiKey: string;
  llmBaseUrl: string; // 锁定 https://ai.t8star.org
  // 分类 API Key（留空时 fallback 到 zhenzhenApiKey）
  gptImageApiKey?: string;
  nanoBananaApiKey?: string;
  mjApiKey?: string;
  veoApiKey?: string;
  grokApiKey?: string;
  seedanceApiKey?: string;
  sunoApiKey?: string;
  preferences?: {
    theme?: 'dark' | 'light';
    language?: string;
  };
}
