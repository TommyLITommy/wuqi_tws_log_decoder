import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import LogPanel from '@/components/LogPanel';
import DecodePanel from '@/components/DecodePanel';
import ThumbPanel from '@/components/ThumbPanel';
import StatusPanel from '@/components/StatusPanel';
import Resizer from '@/components/Resizer';
import type { LogEntry, StatusCheckpoint } from '@/types';
import type { LogPanelHandle } from '@/components/LogPanel';
import type { DecodePanelHandle } from '@/components/DecodePanel';
import { getStatusAtLine, getViewportEndLogIndex } from '@/utils/statusSnapshot';

interface MainLayoutProps {
  allLogs: LogEntry[];
  logLines: string[];
  statusCheckpoints: StatusCheckpoint[];
  filteredIndices: number[];
  selectedId: number | null;
  filterText: string;
  leftWidth: number;
  thumbWidth: number;
  onSelectRow: (id: number, idx: number) => void;
  startResizeLeft: () => void;
  startResizeThumb: () => void;
}

export default function MainLayout({ allLogs, logLines, statusCheckpoints, filteredIndices, selectedId, filterText, leftWidth, thumbWidth,
  onSelectRow, startResizeLeft, startResizeThumb }: MainLayoutProps) {
  const [syncedScrollTop, setSyncedScrollTop] = useState(0);
  const [scrollInfo, setScrollInfo] = useState({ scrollHeight: 1, clientHeight: 1 });
  const isSyncingRef = useRef(false);
  const leftPanelRef = useRef<LogPanelHandle>(null);
  const decodePanelRef = useRef<DecodePanelHandle>(null);

  useEffect(() => {
    const update = () => {
      const info = leftPanelRef.current?.getScrollInfo();
      if (info) setScrollInfo({ scrollHeight: info.scrollHeight, clientHeight: info.clientHeight });
    };
    const interval = setInterval(update, 100);
    update();
    return () => clearInterval(interval);
  }, [filteredIndices.length, allLogs.length]);

  const handleLeftScroll = useCallback((scrollTop: number) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncedScrollTop(scrollTop);
    decodePanelRef.current?.scrollTo(scrollTop);
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  const handleDecodeScroll = useCallback((scrollTop: number) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncedScrollTop(scrollTop);
    leftPanelRef.current?.scrollTo(scrollTop);
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  const handleJumpTo = useCallback((logId: number) => {
    const filteredIdx = filteredIndices.indexOf(logId);
    let targetIdx = filteredIdx;
    if (filteredIdx < 0) {
      let nearestIdx = -1, minDiff = Infinity;
      filteredIndices.forEach((idx, fidx) => {
        const diff = Math.abs(idx - logId);
        if (diff < minDiff) { minDiff = diff; nearestIdx = fidx; }
      });
      targetIdx = nearestIdx;
    }
    if (targetIdx >= 0) {
      const targetScroll = targetIdx * 24;
      setSyncedScrollTop(targetScroll);
      leftPanelRef.current?.scrollTo(targetScroll);
      decodePanelRef.current?.scrollTo(targetScroll);
    }
    return targetIdx;
  }, [filteredIndices]);

  const handleStatusNavigate = useCallback((lineIndex: number) => {
    const targetIdx = handleJumpTo(lineIndex);
    if (targetIdx >= 0) {
      onSelectRow(filteredIndices[targetIdx], targetIdx);
    }
  }, [handleJumpTo, filteredIndices, onSelectRow]);

  const handleThumbScrollTo = useCallback((scrollTop: number) => {
    setSyncedScrollTop(scrollTop);
    leftPanelRef.current?.scrollTo(scrollTop);
    decodePanelRef.current?.scrollTo(scrollTop);
  }, []);

  const viewportEndLogIndex = useMemo(() => {
    return getViewportEndLogIndex(syncedScrollTop, scrollInfo.clientHeight, filteredIndices);
  }, [syncedScrollTop, scrollInfo.clientHeight, filteredIndices]);

  const statusSnapshot = useMemo(() => {
    return getStatusAtLine(statusCheckpoints, logLines, viewportEndLogIndex);
  }, [statusCheckpoints, logLines, viewportEndLogIndex]);

  if (allLogs.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">选择 TWS Log 文件开始分析</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <StatusPanel snapshot={statusSnapshot} onNavigateToLine={handleStatusNavigate} />
      {/* 统一表头 */}
      <div className="flex h-8 bg-bg-secondary/50 border-b border-border flex-shrink-0 select-none">
        <div className="flex items-center px-3 text-xs text-text-secondary font-medium justify-between"
          style={{ width: `${leftWidth}%` }}>
          <span>原始日志</span>
          <span>{filteredIndices.length} / {allLogs.length} 行</span>
        </div>
        <div className="w-[6px] bg-border flex-shrink-0" />
        <div className="flex-1 flex items-center px-3 text-xs text-text-secondary font-medium">
          <span>🔓 协议解码</span>
        </div>
        <div className="w-[6px] bg-border flex-shrink-0" />
        <div className="flex items-center justify-center px-3 text-xs text-text-secondary font-medium"
          style={{ width: thumbWidth }}>
          <span>导航</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: `${leftWidth}%` }} className="flex flex-col min-h-0 min-w-0">
          <LogPanel ref={leftPanelRef} allLogs={allLogs} filteredIndices={filteredIndices}
            selectedId={selectedId} filterText={filterText} scrollTop={syncedScrollTop} 
            onScroll={handleLeftScroll} onSelectRow={onSelectRow} />
        </div>
        <Resizer onResizeStart={startResizeLeft} />
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <DecodePanel ref={decodePanelRef} allLogs={allLogs} filteredIndices={filteredIndices}
            selectedId={selectedId} scrollTop={syncedScrollTop} onScroll={handleDecodeScroll} onSelectRow={onSelectRow} />
        </div>
        <Resizer onResizeStart={startResizeThumb} />
        <div style={{ width: thumbWidth }} className="flex flex-col min-h-0">
          <ThumbPanel allLogs={allLogs} filteredIndices={filteredIndices} scrollTop={syncedScrollTop} scrollHeight={scrollInfo.scrollHeight}
            clientHeight={scrollInfo.clientHeight} onJumpTo={handleJumpTo} onScrollTo={handleThumbScrollTo} />
        </div>
      </div>
    </div>
  );
}