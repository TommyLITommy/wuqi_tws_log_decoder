import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { DecodedResult, LogEntry, ThumbMatch } from '@/types';
import { ITEM_HEIGHT } from '@/utils/constants';

interface ThumbPanelProps {
  allLogs: LogEntry[];
  filteredIndices: number[];
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  onJumpTo: (logId: number) => void;
  onScrollTo: (scrollTop: number) => void;
}

type ThumbLine = { top: number; height: number; badge: DecodedResult['badge'] };

const BADGE_PRIORITY: Record<DecodedResult['badge'], number> = {
  iap2: 10,
  state: 9,
  a2dp: 8,
  profile: 7,
  rpc: 6,
  status: 5,
  hci: 4,
  appcmd: 3,
  appmsg: 2,
  btn: 1,
};

const THUMB_BADGE_BG: Record<DecodedResult['badge'], string> = {
  hci: 'bg-purple-400',
  iap2: 'bg-accent-yellow',
  rpc: 'bg-blue-400',
  status: 'bg-cyan-400',
  appcmd: 'bg-orange-400',
  btn: 'bg-lime-400',
  appmsg: 'bg-indigo-400',
  state: 'bg-amber-400',
  a2dp: 'bg-green-400',
  profile: 'bg-orange-500',
};

const TOOLTIP_BADGE_COLOR: Record<DecodedResult['badge'], string> = {
  hci: '#c084fc',
  iap2: '#f59e0b',
  rpc: '#60a5fa',
  status: '#22d3ee',
  appcmd: '#fb923c',
  btn: '#a3e635',
  appmsg: '#818cf8',
  state: '#fbbf24',
  a2dp: '#4ade80',
  profile: '#f97316',
};

function findNearestFilteredIndex(filteredIndices: number[], logId: number): number {
  const direct = filteredIndices.indexOf(logId);
  if (direct >= 0) return direct;

  let nearestIdx = 0;
  let minDiff = Infinity;
  filteredIndices.forEach((idx, fidx) => {
    const diff = Math.abs(idx - logId);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIdx = fidx;
    }
  });
  return nearestIdx;
}

function logIdToScrollTop(filteredIndices: number[], logId: number): number {
  return findNearestFilteredIndex(filteredIndices, logId) * ITEM_HEIGHT;
}

function buildThumbLines(allLogs: LogEntry[], thumbH: number): ThumbLine[] {
  const total = allLogs.length;
  if (total === 0 || thumbH <= 0) return [];

  const lineHeight = thumbH / total;
  if (lineHeight >= 1) {
    const lines: ThumbLine[] = [];
    allLogs.forEach((log, idx) => {
      if (!log.decoded) return;
      lines.push({
        top: (idx / total) * thumbH,
        height: Math.max(1, lineHeight),
        badge: log.decoded.badge,
      });
    });
    return lines;
  }

  const buckets: Array<DecodedResult['badge'] | null> = Array.from({ length: thumbH }, () => null);
  for (let i = 0; i < total; i++) {
    const decoded = allLogs[i]?.decoded;
    if (!decoded) continue;

    const pixel = Math.min(thumbH - 1, Math.floor((i / total) * thumbH));
    const current = buckets[pixel];
    if (!current || BADGE_PRIORITY[decoded.badge] > BADGE_PRIORITY[current]) {
      buckets[pixel] = decoded.badge;
    }
  }

  const segments: ThumbLine[] = [];
  for (let pixel = 0; pixel < thumbH; pixel++) {
    const badge = buckets[pixel];
    if (!badge) continue;

    const last = segments[segments.length - 1];
    if (last && last.badge === badge && last.top + last.height === pixel) {
      last.height += 1;
    } else {
      segments.push({ top: pixel, height: 1, badge });
    }
  }
  return segments;
}

export default function ThumbPanel({
  allLogs,
  filteredIndices,
  scrollTop,
  scrollHeight,
  clientHeight,
  onJumpTo,
  onScrollTo,
}: ThumbPanelProps) {
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    matches: [] as ThumbMatch[],
    totalMatches: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const thumbContentRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const total = allLogs.length;

  useEffect(() => {
    const el = thumbContentRef.current;
    if (!el) return;

    const updateHeight = () => setThumbHeight(el.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { indTop, indHeight } = useMemo(() => {
    const thumbH = thumbHeight || 1;
    const totalAll = Math.max(total, 1);

    const firstFilteredIdx = Math.floor(scrollTop / ITEM_HEIGHT);
    const lastFilteredIdx = Math.min(
      Math.max(filteredIndices.length - 1, 0),
      Math.max(firstFilteredIdx, Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) - 1)
    );
    const startLog = filteredIndices[Math.max(0, firstFilteredIdx)] ?? 0;
    const endLog = filteredIndices[lastFilteredIdx] ?? startLog;

    return {
      indTop: (startLog / totalAll) * thumbH,
      indHeight: Math.max(((endLog - startLog + 1) / totalAll) * thumbH, 4),
    };
  }, [scrollTop, clientHeight, filteredIndices, total, thumbHeight]);

  const thumbLines = useMemo(
    () => buildThumbLines(allLogs, thumbHeight),
    [allLogs, thumbHeight]
  );

  const scrollToRatio = useCallback((ratio: number) => {
    if (total === 0) return;
    const logId = Math.min(total - 1, Math.floor(ratio * total));
    onScrollTo(logIdToScrollTop(filteredIndices, logId));
  }, [total, filteredIndices, onScrollTo]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scrollLines = 3;
    const delta = e.deltaY > 0 ? 1 : -1;
    const newScrollTop = Math.max(
      0,
      Math.min(scrollHeight - clientHeight, scrollTop + delta * scrollLines * ITEM_HEIGHT)
    );
    onScrollTo(newScrollTop);
  }, [scrollTop, scrollHeight, clientHeight, onScrollTo]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    if (relativeY < 0 || relativeY > rect.height) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }

    const ratio = Math.max(0, Math.min(1, relativeY / rect.height));
    const centerIdx = Math.min(total - 1, Math.floor(ratio * total));
    const range = Math.max(10, Math.floor(total * 0.01));
    const startIdx = Math.max(0, centerIdx - range);
    const endIdx = Math.min(total, centerIdx + range);
    const matches: ThumbMatch[] = [];

    for (let i = startIdx; i < endIdx; i++) {
      if (allLogs[i]?.decoded) {
        matches.push({ line: i + 1, decoded: allLogs[i].decoded! });
      }
    }

    setTooltip({
      visible: true,
      x: e.clientX + 15,
      y: e.clientY - 10,
      title: `L${startIdx + 1}-L${endIdx}（${matches.length} 条解码）`,
      matches: matches.slice(0, 6),
      totalMatches: matches.length,
    });
  }, [allLogs, total]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || total === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onJumpTo(Math.min(total - 1, Math.floor(ratio * total)));
  }, [total, onJumpTo]);

  const handleIndMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'ns-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const thumbContent = thumbContentRef.current;
      if (!thumbContent) return;
      const thumbRect = thumbContent.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientY - thumbRect.top) / thumbRect.height));
      scrollToRatio(ratio);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
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
  }, [isDragging, scrollToRatio]);

  return (
    <div
      ref={thumbContentRef}
      className="flex-1 relative overflow-hidden cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      {thumbLines.map((line, i) => (
        <div
          key={i}
          className={`absolute left-0 right-0 opacity-90 ${THUMB_BADGE_BG[line.badge]}`}
          style={{ top: line.top, height: line.height }}
        />
      ))}
      <div
        className={`absolute left-0 right-0 border-2 border-accent-red bg-accent-red/20 pointer-events-auto cursor-ns-resize z-20 transition-none hover:bg-accent-red/35 hover:border-red-400 ${isDragging ? 'bg-accent-red/50 !border-red-300' : ''}`}
        style={{ top: indTop, height: indHeight }}
        onMouseDown={handleIndMouseDown}
      />

      {tooltip.visible && (
        <div
          className="fixed bg-bg-secondary border border-border rounded p-2 text-xs text-text-primary pointer-events-none z-[1000] shadow-lg max-w-[250px]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="text-text-secondary text-[10px] mb-1">{tooltip.title}</div>
          {tooltip.matches.length === 0 ? (
            <span className="text-text-secondary">此区域无解码行</span>
          ) : (
            <>
              {tooltip.matches.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 my-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: TOOLTIP_BADGE_COLOR[m.decoded.badge] ?? '#60a5fa' }}
                  />
                  <span className="text-accent-green truncate">{m.decoded.name}</span>
                  <span className="text-text-secondary text-[10px] flex-shrink-0">L{m.line}</span>
                </div>
              ))}
              {tooltip.totalMatches > tooltip.matches.length && (
                <div className="text-text-secondary mt-1">... 还有 {tooltip.totalMatches - tooltip.matches.length} 条</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
