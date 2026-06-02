/**
 * ============================================================================
 * ToolboxParamNode.tsx - 工具箱参数节点 - 常用参数快捷配置
 * ============================================================================
 * 
 * 【功能定位】详见 COMMENT_PROGRESS.md 和 DESIGN_DOCUMENT.md
 * 【核心特性】多特性支持，请参考设计文档详细说明
 * 【数据流】输入输出端口定义请参考节点实现代码
 * 【关键参数】具体参数说明请查看组件内部实现
 * 
 * @module components/nodes/ToolboxParamNode
 * @author ZhenzhenMagic Team
 */

import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Wand2, Film, Sparkles } from 'lucide-react';
import { useUpdateNodeData } from './useUpdateNodeData';

/**
 * ToolboxParamNode - 参数提供节点
 * 提供预设的 prompt 片段或运动模板,作为下游节点的提示词来源
 *
 * 通过 data.kind 区分:
 *   - 'cinematic' = 电影感预设(色彩/运镜/氛围)
 *   - 'video-motion' = 视频运动预设(摇镜/推拉/环绕)
 *   - 其它 = 通用参数(自定义)
 *
 * 输出:data.prompt(下游通过 prompt 收集消费)
 */

interface Preset {
  id: string;
  label: string;
  text: string;
}

const CINEMATIC_PRESETS: Preset[] = [
  { id: 'soft-light', label: '柔光', text: 'soft cinematic lighting, golden hour, gentle shadows' },
  { id: 'noir', label: '黑色电影', text: 'film noir style, high contrast, hard shadows, monochrome' },
  { id: 'dreamy', label: '梦幻', text: 'dreamy soft focus, pastel palette, ethereal glow' },
  { id: 'epic', label: '史诗', text: 'epic cinematic shot, dramatic lighting, ultra wide, IMAX' },
  { id: 'vintage', label: '复古胶片', text: 'vintage 35mm film grain, faded colors, kodak portra' },
  { id: 'cyberpunk', label: '赛博朋克', text: 'cyberpunk neon city, rain reflections, blade runner mood' },
];

const MOTION_PRESETS: Preset[] = [
  { id: 'static', label: '静止', text: 'static shot, locked camera, no movement' },
  { id: 'pan-l', label: '左摇', text: 'slow pan to the left, smooth camera movement' },
  { id: 'pan-r', label: '右摇', text: 'slow pan to the right, smooth camera movement' },
  { id: 'zoom-in', label: '推近', text: 'slow zoom in, gradually closer to subject' },
  { id: 'zoom-out', label: '拉远', text: 'slow zoom out, revealing wider scene' },
  { id: 'orbit', label: '环绕', text: 'orbit around the subject, 360 degree shot' },
  { id: 'dolly', label: '推轨', text: 'dolly forward through the scene' },
  { id: 'aerial', label: '航拍', text: 'aerial drone shot, descending from above' },
];

const ToolboxParamNode = (p: NodeProps) => {
  const update = useUpdateNodeData(p.id);
  const d = p.data as any;
  const kind: 'cinematic' | 'video-motion' | string = d?.kind || 'cinematic';
  const selectedId: string | undefined = d?.presetId;
  const prompt: string = d?.prompt || '';

  const meta = useMemo(() => {
    if (kind === 'video-motion') {
      return {
        title: '运动模板',
        subtitle: '相机运动',
        icon: <Film size={13} />,
        presets: MOTION_PRESETS,
        color: '#a78bfa',
        bg: 'rgba(167,139,250,.2)',
        text: '#ddd6fe',
        shadow: 'rgba(167,139,250,.2)',
        chipActive: 'bg-violet-500/30 text-violet-100 border-violet-400/40',
      };
    }
    return {
      title: '电影感预设',
      subtitle: '风格氛围',
      icon: <Wand2 size={13} />,
      presets: CINEMATIC_PRESETS,
      color: '#f472b6',
      bg: 'rgba(244,114,182,.2)',
      text: '#fbcfe8',
      shadow: 'rgba(244,114,182,.2)',
      chipActive: 'bg-pink-500/30 text-pink-100 border-pink-400/40',
    };
  }, [kind]);

  const handleSelect = (preset: Preset) => {
    update({ presetId: preset.id, prompt: preset.text });
  };

  return (
    <div
      className={`relative rounded-xl border-2 transition-all ${
        p.selected ? 'shadow-2xl' : 'border-white/15 hover:border-white/30'
      }`}
      style={{
        background: 'rgba(20,20,22,.92)',
        backdropFilter: 'blur(8px)',
        width: 240,
        borderColor: p.selected ? meta.color : undefined,
        boxShadow: p.selected ? `0 0 0 1px ${meta.color}, 0 16px 32px ${meta.shadow}` : undefined,
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: meta.color, border: 0 }} />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: meta.bg, color: meta.text, boxShadow: `inset 0 0 0 1px ${meta.color}` }}
        >
          {meta.icon}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">{meta.title}</div>
          <div className="text-[10px] text-white/40">{meta.subtitle}</div>
        </div>
      </div>

      <div className="p-2.5 space-y-2" onMouseDown={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-2 gap-1.5">
          {meta.presets.map((ps) => (
            <button
              key={ps.id}
              onClick={() => handleSelect(ps)}
              className={`py-1 px-1.5 rounded text-[11px] transition-colors border ${
                selectedId === ps.id
                  ? meta.chipActive
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
              }`}
            >
              {ps.label}
            </button>
          ))}
        </div>

        {prompt && (
          <div className="text-[10px] text-white/60 bg-white/5 border border-white/10 rounded px-2 py-1.5 leading-relaxed">
            <div className="flex items-center gap-1 text-white/40 mb-0.5">
              <Sparkles size={9} /> 输出
            </div>
            <span className="break-all">{prompt}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ToolboxParamNode);
