/**
 * ============================================================================
 * useUpdateNodeData.ts - 节点数据更新 Hook - 安全高效更新节点数据
 * ============================================================================
 * 
 * 【功能定位】详见 COMMENT_PROGRESS.md 和 DESIGN_DOCUMENT.md
 * 【核心特性】多特性支持，请参考设计文档详细说明
 * 【数据流】输入输出端口定义请参考节点实现代码
 * 【关键参数】具体参数说明请查看组件内部实现
 * 
 * @module components/nodes/useUpdateNodeData.ts
 * @author ZhenzhenMagic Team
 */

import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

/**
 * 用于在节点内部更新自身 data 的 hook
 * 通过 reactflow 的 setNodes 接口更新指定 id 的节点
 */
export function useUpdateNodeData(nodeId: string) {
  const { setNodes } = useReactFlow();
  return useCallback(
    (patch: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...(n.data as any), ...patch } }
            : n
        )
      );
    },
    [nodeId, setNodes]
  );
}
