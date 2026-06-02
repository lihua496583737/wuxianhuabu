/**
 * ============================================================================
 * DrawingBoardNode.tsx - 画板节点 - 手绘板功能，自由绘制
 * ============================================================================
 * 
 * 【功能定位】详见 COMMENT_PROGRESS.md 和 DESIGN_DOCUMENT.md
 * 【核心特性】多特性支持，请参考设计文档详细说明
 * 【数据流】输入输出端口定义请参考节点实现代码
 * 【关键参数】具体参数说明请查看组件内部实现
 * 
 * @module components/nodes/DrawingBoardNode
 * @author ZhenzhenMagic Team
 */

import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Pencil, Eraser, Trash2, Save, Loader2 } from 'lucide-react';
import { useUpdateNodeData } from './useUpdateNodeData';

/**
 * DrawingBoardNode - 手绘画板
 * 鼠标 / 触屏在 canvas 上绘画,保存时上传 base64 PNG 到后端
 * 输出 imageUrl 供下游消费
 */
const COLOR = '#fb923c';
const W = 320;
const H = 200;

type Tool = 'pen' | 'eraser';

const DrawingBoardNode = (p: NodeProps) => {
  const update = useUpdateNodeData(p.id);
  const d = p.data as any;
  const savedUrl: string | undefined = d?.imageUrl;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化 canvas:加载已保存的图(若有)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1f1f23';
    ctx.fillRect(0, 0, W, H);
    if (savedUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ctx.drawImage(img, 0, 0, W, H);
      img.src = savedUrl;
    }
  }, [savedUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const t = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    return {
      x: ((t.clientX - rect.left) / rect.width) * W,
      y: ((t.clientY - rect.top) / rect.height) * H,
    };
  };

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    drawingRef.current = true;
    lastPosRef.current = getPos(e);
  }, []);

  const move = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawingRef.current) return;
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const cur = getPos(e);
      const last = lastPosRef.current || cur;
      ctx.strokeStyle = tool === 'eraser' ? '#1f1f23' : color;
      ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
      lastPosRef.current = cur;
    },
    [tool, color, size]
  );

  const end = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1f1f23';
    ctx.fillRect(0, 0, W, H);
  };

  const save = async () => {
    setError(null);
    const c = canvasRef.current;
    if (!c) return;
    setSaving(true);
    try {
      const dataUrl = c.toDataURL('image/png');
      const r = await fetch('/api/files/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, prefix: 'draw' }),
      });
      const json = await r.json();
      if (!r.ok || !json.success) throw new Error(json?.error || `HTTP ${r.status}`);
      update({ imageUrl: json.data.url });
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border-2 transition-all ${
        p.selected ? 'shadow-2xl' : 'border-white/15 hover:border-white/30'
      }`}
      style={{
        background: 'rgba(20,20,22,.92)',
        backdropFilter: 'blur(8px)',
        width: W + 20,
        borderColor: p.selected ? COLOR : undefined,
        boxShadow: p.selected ? `0 0 0 1px ${COLOR}, 0 16px 32px rgba(251,146,60,.2)` : undefined,
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: COLOR, border: 0 }} />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: 'rgba(251,146,60,.2)', color: '#fed7aa', boxShadow: `inset 0 0 0 1px ${COLOR}` }}
        >
          <Pencil size={13} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">画板</div>
          <div className="text-[10px] text-white/40">{tool === 'pen' ? '画笔' : '橡皮'} · {size}px</div>
        </div>
      </div>

      <div className="p-2 space-y-2" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTool('pen')}
            className={`flex-1 py-1 rounded text-[11px] flex items-center justify-center gap-1 ${
              tool === 'pen' ? 'bg-orange-500/30 text-orange-100' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Pencil size={11} /> 画笔
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`flex-1 py-1 rounded text-[11px] flex items-center justify-center gap-1 ${
              tool === 'eraser' ? 'bg-orange-500/30 text-orange-100' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Eraser size={11} /> 橡皮
          </button>
          <button
            onClick={clearCanvas}
            className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-200"
            title="清空"
          >
            <Trash2 size={11} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-7 h-6 rounded bg-transparent border border-white/10 cursor-pointer"
            disabled={tool === 'eraser'}
          />
          <input
            type="range"
            min={1}
            max={20}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="flex-1 accent-orange-400"
          />
          <span className="text-[10px] text-white/50 w-6 text-right">{size}px</span>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded border border-white/10 cursor-crosshair touch-none w-full"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-1.5 rounded text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? '保存中...' : '保存为图像'}
        </button>

        {error && (
          <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
            {error}
          </div>
        )}
        {savedUrl && !saving && (
          <div className="text-[10px] text-emerald-300/80 text-center">已保存 ✓</div>
        )}
      </div>
    </div>
  );
};

export default memo(DrawingBoardNode);
