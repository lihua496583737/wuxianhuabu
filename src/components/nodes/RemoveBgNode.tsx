/**
 * ============================================================================
 * RemoveBgNode.tsx - 去背节点 - 自动移除图像背景
 * ============================================================================
 * 
 * 【功能定位】详见 COMMENT_PROGRESS.md 和 DESIGN_DOCUMENT.md
 * 【核心特性】多特性支持，请参考设计文档详细说明
 * 【数据流】输入输出端口定义请参考节点实现代码
 * 【关键参数】具体参数说明请查看组件内部实现
 * 
 * @module components/nodes/RemoveBgNode
 * @author ZhenzhenMagic Team
 */

import { memo } from 'react';
import { Scissors } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { ImageOpFrame } from './ImageOpFrame';
import { opRemoveBg } from '../../services/imageOps';

/**
 * RemoveBgNode - 抠图(占位实现,后端会返回原图 + warning)
 * 后续可接入第三方抠图服务
 */
const RemoveBgNode = (p: NodeProps) => {
  return (
    <ImageOpFrame
      id={p.id}
      data={p.data}
      selected={p.selected}
      title="抠图"
      subtitle="移除背景"
      icon={<Scissors size={13} />}
      colorHex="#fb923c"
      bgRgba="rgba(251,146,60,.2)"
      shadowRgba="rgba(251,146,60,.2)"
      textHex="#fed7aa"
      buttonClasses="bg-orange-500/20 hover:bg-orange-500/30 text-orange-200"
      renderSettings={() => (
        <div className="text-[10px] text-white/40 px-1 py-0.5 leading-relaxed">
          ⚠ 占位实现 - 当前仅转 PNG 输出,后续接入抠图服务
        </div>
      )}
      runOp={async (img) => opRemoveBg(img as string)}
    />
  );
};

export default memo(RemoveBgNode);
