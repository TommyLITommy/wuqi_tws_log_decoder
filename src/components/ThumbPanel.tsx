import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { LogEntry, ThumbMatch } from '@/types';

interface ThumbPanelProps {
  allLogs: LogEntry[];
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  onJumpTo: (logId: number) => void;
  onScrollTo: (scrollTop: number) => void;
}

export default function ThumbPanel({ allLogs, scrollTop, scrollHeight, clientHeight, onJumpTo, onScrollTo }: ThumbPanelProps) {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', matches: [] as ThumbMatch[] });
  const [isDragging, setIsDragging] = useState(false);
  const thumbContentRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const total = allLogs.length;

  const { indTop, indHeight } = useMemo(() => {
    const safeHeight = scrollHeight || 1;
    const thumbH = thumbContentRef.current?.clientHeight || 600;
    return {
      indTop: (scrollTop / safeHeight) * thumbH,
      indHeight: Math.max((clientHeight / safeHeight) * thumbH, 4),
    };
  }, [scrollTop, scrollHeight, clientHeight]);

  const thumbLines = useMemo(() => {
    if (total === 0) return [];
    const thumbH = thumbContentRef.current?.clientHeight || 600;
    const linesPerPixel = Math.max(1, total / thumbH);
    const lines: { top: number; height: number; type: 'hci' | 'iap2' }[] = [];

    if (linesPerPixel <= 1) {
      allLogs.forEach((log, idx) => {
        if (log.decoded) lines.push({ top: idx, height: Math.max(1, 1 / linesPerPixel), type: log.decoded.badge });
      });
    } else {
      for (let pixel = 0; pixel < thumbH; pixel++) {
        const startIdx = Math.floor(pixel * linesPerPixel);
        const endIdx = Math.min(startIdx + Math.ceil(linesPerPixel), total);
        let hasHci = false, hasIap2 = false;
        for (let i = startIdx; i < endIdx; i++) {
          if (allLogs[i]?.decoded) {
            if (allLogs[i].decoded!.badge === 'iap2') hasIap2 = true;
            else hasHci = true;
          }
        }
        if (hasIap2 || hasHci) lines.push({ top: pixel, height: 1, type: hasIap2 ? 'iap2' : 'hci' });
      }
    }
    return lines;
  }, [allLogs, total]);

  // 丝滑的滚轮滚动 - 使用固定像素步长
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // 每次滚动移动 3 行的高度（72px），这样更丝滑
    const lineHeight = 24;
    const scrollLines = 3;
    const delta = e.deltaY > 0 ? 1 : -1;
    const newScrollTop = Math.max(0, Math.min(scrollHeight - clientHeight, scrollTop + delta * scrollLines * lineHeight));
    onScrollTo(newScrollTop);
  }, [scrollTop, scrollHeight, clientHeight, onScrollTo]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) { setTooltip(prev => ({ ...prev, visible: false })); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    if (relativeY < 0 || relativeY > rect.height) { setTooltip(prev => ({ ...prev, visible: false })); return; }

    const ratio = Math.max(0, Math.min(1, relativeY / rect.height));
    const centerIdx = Math.floor(ratio * total);
    const range = Math.max(10, Math.floor(total * 0.01));
    const startIdx = Math.max(0, centerIdx - range);
    const endIdx = Math.min(total, centerIdx + range);
    const matches: ThumbMatch[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      if (allLogs[i]?.decoded) matches.push({ line: i + 1, decoded: allLogs[i].decoded! });
    }

    setTooltip({ visible: true, x: e.clientX + 15, y: e.clientY - 10,
      title: `Lines ${startIdx + 1}-${endIdx} (${matches.length} matches)`,
      matches: matches.slice(0, 6) });
  }, [allLogs, total]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onJumpTo(Math.floor(ratio * total));
  }, [total, onJumpTo]);

  const handleIndMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    isDraggingRef.current = true; setIsDragging(true);
    document.body.style.cursor = 'ns-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const thumbContent = thumbContentRef.current;
      if (!thumbContent) return;
      const thumbRect = thumbContent.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientY - thumbRect.top) / thumbRect.height));
      onScrollTo(ratio * scrollHeight);
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false; setIsDragging(false);
        document.body.style.cursor = '';
      }
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, scrollHeight, onScrollTo]);

  return (
    <div ref={thumbContentRef} className="flex-1 relative overflow-hidden cursor-crosshair"
      onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
      onClick={handleClick} onWheel={handleWheel}>
      {thumbLines.map((line, i) => (
        <div key={i} className={`absolute left-0 right-0 opacity-90 ${line.type === 'iap2' ? 'bg-accent-yellow' : 'bg-accent-cyan'}`}
          style={{ top: line.top, height: line.height }} />
      ))}
      <div className={`absolute left-0 right-0 border-2 border-accent-red bg-accent-red/20 pointer-events-auto cursor-ns-resize z-20 transition-none hover:bg-accent-red/35 hover:border-red-400 ${isDragging ? 'bg-accent-red/50 !border-red-300' : ''}`}
        style={{ top: indTop, height: indHeight }} onMouseDown={handleIndMouseDown} />

      {tooltip.visible && (
        <div className="fixed bg-bg-secondary border border-border rounded p-2 text-xs text-text-primary pointer-events-none z-[1000] shadow-lg max-w-[250px]"
          style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="text-text-secondary text-[10px] mb-1">{tooltip.title}</div>
          {tooltip.matches.length === 0 ? (
            <span className="text-text-secondary">No matches in this area</span>
          ) : (
            <>
              {tooltip.matches.map((m, i) => {
                const color = m.decoded.badge === 'iap2' ? '#f59e0b' : '#60a5fa';
                return (
                  <div key={i} className="flex items-center gap-1.5 my-0.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-accent-green">{m.decoded.name}</span>
                    <span className="text-text-secondary text-[10px]">L{m.line}</span>
                  </div>
                );
              })}
              {tooltip.matches.length >= 6 && <div className="text-text-secondary mt-1">... more</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}