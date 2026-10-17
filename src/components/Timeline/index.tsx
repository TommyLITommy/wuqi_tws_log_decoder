import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useTimeline } from '@/hooks/useTimeline';
import { TimelineToolbar } from '@/components/Timeline/TimelineToolbar';
import { TimelineTooltip } from '@/components/Timeline/TimelineTooltip';
import { TimelineLegend } from '@/components/Timeline/TimelineLegend';
import { TIMELINE_LABEL_W, TIMELINE_MAIN_H } from '@/components/Timeline/timelineLayout';
import type { LogEvent } from '@/types';
import { getContrastColor } from '@/utils/color';
import { buildLogEvents, findActiveMarkerLine } from '@/utils/statusTimeline';
import { findLineIndexAtTime, formatTimelineClock } from '@/utils/logTimestamp';

const MAIN_CANVAS_HEIGHT = TIMELINE_MAIN_H;
const OVERVIEW_HEIGHT = 52;
const MAX_ZOOM = 500;
const MIN_ZOOM = 0.001;
const COLLAPSED_HEIGHT = 32;
const KEYBOARD_SCROLL_STEP = 50;

const BG_MAIN = '#0f172a';
const BG_AXIS = '#1e293b';
const GRID = '#334155';
const TEXT_MUTED = '#94a3b8';

export interface TimelineProps {
  logLines: string[];
  viewportLineIndex: number;
  onNavigateToLine?: (lineIndex: number) => void;
}

function formatTimeLabel(ms: number, hasRealTime: boolean): string {
  if (hasRealTime) {
    return new Date(ms).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  return formatTimelineClock(ms, false);
}

export function Timeline({ logLines, viewportLineIndex, onNavigateToLine }: TimelineProps) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState(800);
  const chartWidth = Math.max(1, containerWidth - TIMELINE_LABEL_W);

  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingOverview, setIsDraggingOverview] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScrollLeft, setDragStartScrollLeft] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hoveredEvent, setHoveredEvent] = useState<LogEvent | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [disabledEventTypes, setDisabledEventTypes] = useState<Set<string>>(() => new Set());

  const [tooltip, setTooltip] = useState<{
    event: LogEvent | null;
    x: number;
    y: number;
    visible: boolean;
  }>({ event: null, x: 0, y: 0, visible: false });

  const bundle = useMemo(() => buildLogEvents(logLines), [logLines]);
  const fallbackTimeRange = useMemo(
    () => ({
      start: bundle.timeMinMs,
      end: Math.max(bundle.timeMinMs + 1, bundle.timeMaxMs),
    }),
    [bundle.timeMinMs, bundle.timeMaxMs]
  );

  const toggleEventType = useCallback((type: string) => {
    setDisabledEventTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const {
    timeRange,
    tracks,
    trackHeight,
    headerHeight,
    getTrackIndex,
    getTrackCount,
    visibleEvents,
    allEvents,
    hasRealTime,
    trackOrder,
  } = useTimeline(
    bundle.events,
    disabledEventTypes,
    bundle.hasRealTime,
    fallbackTimeRange
  );

  const playheadMs = findActiveMarkerLine(bundle.lineTimesMs, viewportLineIndex);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of allEvents) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }, [allEvents]);

  const timeToX = useCallback(
    (timestamp: number) => {
      const padding = 24;
      const availableWidth = chartWidth * zoom;
      if (timeRange.end === timeRange.start) return padding;
      const ratio = (timestamp - timeRange.start) / (timeRange.end - timeRange.start);
      return padding + ratio * (availableWidth - padding * 2);
    },
    [chartWidth, zoom, timeRange]
  );

  const xToTime = useCallback(
    (x: number) => {
      if (timeRange.end === timeRange.start) return timeRange.start;
      const padding = 24;
      const availableWidth = chartWidth * zoom;
      const relativeX = x - padding + scrollLeft;
      const ratio = relativeX / (availableWidth - padding * 2);
      return timeRange.start + ratio * (timeRange.end - timeRange.start);
    },
    [chartWidth, zoom, scrollLeft, timeRange]
  );

  const findEventAtPosition = useCallback(
    (x: number, y: number): LogEvent | null => {
      if (y < headerHeight || y > MAIN_CANVAS_HEIGHT) return null;
      const trackCount = getTrackCount();
      const trackIndex = Math.floor((y - headerHeight) / trackHeight);
      if (trackIndex < 0 || trackIndex >= trackCount) return null;

      for (const event of visibleEvents) {
        if (getTrackIndex(event.type) !== trackIndex) continue;
        const eventX = timeToX(event.timestamp) - scrollLeft;
        const eventY = headerHeight + trackIndex * trackHeight + trackHeight / 2;
        if (Math.hypot(x - eventX, y - eventY) <= 8) return event;
      }
      return null;
    },
    [visibleEvents, getTrackIndex, timeToX, scrollLeft, trackHeight, headerHeight, getTrackCount]
  );

  const getViewportRect = useCallback(() => {
    const virtualWidth = chartWidth * zoom;
    const viewportWidth = chartWidth / Math.max(0.1, zoom);
    const viewportLeft = (scrollLeft / virtualWidth) * chartWidth;
    return {
      left: Math.max(0, Math.min(viewportLeft, chartWidth - 5)),
      width: Math.max(5, Math.min(viewportWidth, chartWidth)),
    };
  }, [chartWidth, zoom, scrollLeft]);

  const getMaxScroll = useCallback(() => {
    return Math.max(0, chartWidth * zoom - chartWidth);
  }, [chartWidth, zoom]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (isCollapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const maxScroll = getMaxScroll();
      if (maxScroll === 0) return;
      setScrollLeft(prev =>
        e.key === 'ArrowLeft'
          ? Math.max(0, prev - KEYBOARD_SCROLL_STEP * zoom)
          : Math.min(maxScroll, prev + KEYBOARD_SCROLL_STEP * zoom)
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCollapsed, zoom, getMaxScroll]);

  useEffect(() => {
    if (isCollapsed) return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.fillStyle = BG_MAIN;
    ctx.fillRect(0, 0, chartWidth, MAIN_CANVAS_HEIGHT);

    ctx.fillStyle = BG_AXIS;
    ctx.fillRect(0, 0, chartWidth, headerHeight);

    const trackCount = getTrackCount();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= trackCount; i++) {
      const y = headerHeight + i * trackHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }

    if (hoveredEvent) {
      const hoverTrack = getTrackIndex(hoveredEvent.type);
      if (hoverTrack >= 0) {
        const rowY = headerHeight + hoverTrack * trackHeight;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fillRect(0, rowY, chartWidth, trackHeight);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, rowY + 0.5, chartWidth - 1, trackHeight - 1);
      }
    }

    const duration = timeRange.end - timeRange.start;
    const step = Math.max(400, duration / 24 / Math.max(zoom, 0.08));

    ctx.font = '10px Consolas, Monaco, monospace';
    ctx.fillStyle = TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let t = timeRange.start; t <= timeRange.end; t += step) {
      const x = timeToX(t) - scrollLeft;
      if (x < -20 || x > chartWidth + 20) continue;
      ctx.fillText(formatTimeLabel(t, hasRealTime), x, headerHeight * 0.65);
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, MAIN_CANVAS_HEIGHT);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.85)';
      ctx.stroke();
    }

    visibleEvents.forEach(event => {
      const trackIndex = getTrackIndex(event.type);
      if (trackIndex < 0) return;
      const x = timeToX(event.timestamp) - scrollLeft;
      const y = headerHeight + trackIndex * trackHeight + trackHeight / 2;
      if (x < -12 || x > chartWidth + 12) return;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = event.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (hoveredEvent === event) {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = getContrastColor(event.color);
      ctx.fillText(event.icon, x, y);
    });

    const playheadX = timeToX(playheadMs) - scrollLeft;
    if (playheadX >= 0 && playheadX <= chartWidth) {
      ctx.beginPath();
      ctx.moveTo(playheadX, headerHeight);
      ctx.lineTo(playheadX, MAIN_CANVAS_HEIGHT);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [
    chartWidth,
    scrollLeft,
    zoom,
    hoveredEvent,
    timeRange,
    visibleEvents,
    getTrackIndex,
    trackHeight,
    headerHeight,
    getTrackCount,
    timeToX,
    isCollapsed,
    hasRealTime,
    playheadMs,
  ]);

  useEffect(() => {
    if (isCollapsed) return;
    const canvas = overviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.fillStyle = BG_MAIN;
    ctx.fillRect(0, 0, chartWidth, OVERVIEW_HEIGHT);

    if (timeRange.end <= timeRange.start) return;

    const padding = 8;
    const usableWidth = chartWidth - padding * 2;
    const duration = timeRange.end - timeRange.start;
    const timeScale = usableWidth / duration;
    const trackCount = getTrackCount();

    const pixelMap = new Map<number, Map<number, string>>();
    allEvents.forEach(event => {
      if (disabledEventTypes.has(event.type)) return;
      const x = Math.floor((event.timestamp - timeRange.start) * timeScale);
      const trackIdx = getTrackIndex(event.type);
      const y =
        trackCount > 0
          ? Math.floor((trackIdx + 0.5) * ((OVERVIEW_HEIGHT - 8) / trackCount)) + 4
          : OVERVIEW_HEIGHT / 2;
      if (!pixelMap.has(x)) pixelMap.set(x, new Map());
      pixelMap.get(x)!.set(y, event.color);
    });

    pixelMap.forEach((yMap, x) => {
      yMap.forEach((color, y) => {
        ctx.fillStyle = color;
        ctx.fillRect(padding + x, y, 1, 2);
      });
    });

    const viewport = getViewportRect();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(padding, 4, viewport.left, OVERVIEW_HEIGHT - 8);
    ctx.fillRect(
      padding + viewport.left + viewport.width,
      4,
      chartWidth - padding - viewport.left - viewport.width,
      OVERVIEW_HEIGHT - 8
    );

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding + viewport.left, 4, viewport.width, OVERVIEW_HEIGHT - 8);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(padding + viewport.left, 4, viewport.width, OVERVIEW_HEIGHT - 8);
  }, [
    chartWidth,
    allEvents,
    getTrackIndex,
    getTrackCount,
    timeRange,
    getViewportRect,
    isCollapsed,
    disabledEventTypes,
  ]);

  const handleMainMouseDown = (e: ReactMouseEvent) => {
    if (isCollapsed) return;
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickedEvent = findEventAtPosition(x, y);
    if (clickedEvent) {
      onNavigateToLine?.(clickedEvent.lineIndex);
      return;
    }
    setIsDraggingMain(true);
    setDragStartX(e.clientX);
    setDragStartScrollLeft(scrollLeft);
  };

  const handleMainDoubleClick = (e: ReactMouseEvent) => {
    if (isCollapsed) return;
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickedEvent = findEventAtPosition(x, y);
    if (clickedEvent) {
      onNavigateToLine?.(clickedEvent.lineIndex);
      return;
    }
    onNavigateToLine?.(findLineIndexAtTime(bundle.lineTimesMs, xToTime(x + scrollLeft)));
  };

  const handleMainMouseMove = (e: ReactMouseEvent) => {
    if (isCollapsed) return;
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingMain) {
      const deltaX = dragStartX - e.clientX;
      const maxScroll = getMaxScroll();
      setScrollLeft(Math.max(0, Math.min(maxScroll, dragStartScrollLeft + deltaX)));
      return;
    }

    const event = findEventAtPosition(x, y);
    setHoveredEvent(event);
    setTooltip(
      event
        ? { event, x: e.clientX, y: e.clientY, visible: true }
        : prev => ({ ...prev, visible: false })
    );
  };

  const handleOverviewMouseDown = (e: ReactMouseEvent) => {
    if (isCollapsed) return;
    const rect = overviewCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    setIsDraggingOverview(true);
    setDragStartX(e.clientX);
    const ratio = x / chartWidth;
    const virtualWidth = chartWidth * zoom;
    const targetScrollLeft = ratio * virtualWidth - chartWidth / 2;
    setScrollLeft(Math.max(0, Math.min(getMaxScroll(), targetScrollLeft)));
  };

  const handleOverviewMouseMove = (e: ReactMouseEvent) => {
    if (!isDraggingOverview || isCollapsed) return;
    const deltaX = e.clientX - dragStartX;
    setScrollLeft(prev => Math.max(0, Math.min(getMaxScroll(), prev + deltaX * zoom)));
    setDragStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDraggingMain(false);
    setIsDraggingOverview(false);
  };

  const handleWheel = (e: ReactWheelEvent) => {
    if (isCollapsed || !e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseTime = xToTime(mouseX + scrollLeft);
      setZoom(newZoom);
      const newX = timeToX(mouseTime) - mouseX;
      setScrollLeft(Math.max(0, Math.min(getMaxScroll(), newX)));
    } else {
      setZoom(newZoom);
    }
  };

  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z * 1.2));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z / 1.2));
  const resetZoom = () => {
    setZoom(1);
    setScrollLeft(0);
  };
  const fitToWindow = () => {
    setZoom(1);
    setScrollLeft(0);
  };

  if (logLines.length === 0) return null;

  const rangeStartLabel = formatTimeLabel(timeRange.start, hasRealTime);
  const rangeEndLabel = formatTimeLabel(timeRange.end, hasRealTime);

  return (
    <div
      ref={containerRef}
      data-debug-component="StatusTimeline"
      className="relative flex shrink-0 flex-col overflow-hidden border-b border-border bg-[#0b1220]"
      style={{ minHeight: isCollapsed ? COLLAPSED_HEIGHT : undefined }}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex h-8 w-full items-center gap-2 px-3 text-left text-xs text-text-secondary hover:bg-bg-secondary/60"
        >
          <span className="font-medium text-text-primary">TWS 事件时间轴</span>
          <span className="tabular-nums">{allEvents.length} 个事件</span>
          <span className="ml-auto">展开 ▼</span>
        </button>
      ) : (
        <>
          <div className="border-b border-border/70 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-[12px] font-medium text-text-primary">TWS 事件时间轴</span>
                <span className="shrink-0 tabular-nums text-[11px] text-text-secondary">
                  {allEvents.length} 个事件
                </span>
                <span className="hidden truncate text-[10px] text-text-secondary xl:inline">
                  （拖拽平移 / Ctrl+滚轮缩放 / ←→ 键移动 / 双击跳转）
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="shrink-0 text-[11px] text-text-secondary hover:text-text-primary"
              >
                收起 ▲
              </button>
            </div>
            <div className="mt-1.5 flex justify-end border-t border-border/40 pt-1.5">
              <TimelineToolbar
                zoom={zoom}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onReset={resetZoom}
                onFit={fitToWindow}
              />
            </div>
          </div>

          <div className="flex min-h-0 items-start" style={{ height: MAIN_CANVAS_HEIGHT }}>
            <TimelineLegend
              trackOrder={trackOrder}
              typeCounts={typeCounts}
              allEvents={allEvents}
              disabledEventTypes={disabledEventTypes}
              onToggleType={toggleEventType}
              axisHeight={headerHeight}
              rowHeight={trackHeight}
              highlightedType={hoveredEvent?.type ?? null}
            />
            <canvas
              ref={mainCanvasRef}
              width={chartWidth}
              height={MAIN_CANVAS_HEIGHT}
              className="block min-w-0 flex-1"
              style={{
                width: chartWidth,
                height: MAIN_CANVAS_HEIGHT,
                cursor: isDraggingMain ? 'grabbing' : hoveredEvent ? 'pointer' : 'grab',
              }}
              onMouseDown={handleMainMouseDown}
              onDoubleClick={handleMainDoubleClick}
              onMouseMove={handleMainMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          </div>

          <div className="flex border-t border-border/70">
            <div
              className="flex shrink-0 flex-col justify-between border-r border-border/60 bg-bg-secondary/40 px-2 py-1 text-[10px] text-text-secondary"
              style={{ width: TIMELINE_LABEL_W, height: OVERVIEW_HEIGHT }}
            >
              <span>总览</span>
              <div className="flex justify-between gap-1 tabular-nums">
                <span>{rangeStartLabel}</span>
                <span>{rangeEndLabel}</span>
              </div>
            </div>
            <canvas
              ref={overviewCanvasRef}
              width={chartWidth}
              height={OVERVIEW_HEIGHT}
              className="block min-w-0 flex-1"
              style={{
                width: chartWidth,
                height: OVERVIEW_HEIGHT,
                cursor: isDraggingOverview ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleOverviewMouseDown}
              onMouseMove={handleOverviewMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <TimelineTooltip {...tooltip} />
        </>
      )}
    </div>
  );
}

export default Timeline;
