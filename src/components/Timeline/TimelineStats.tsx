interface TimelineStatsProps {
  totalEvents: number;
  visibleEvents: number;
  timeRange: { start: number; end: number };
  hasRealTime: boolean;
}

function formatDuration(ms: number): string {
  if (ms > 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  if (ms > 60_000) return `${(ms / 60_000).toFixed(1)}min`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TimelineStats({
  totalEvents,
  visibleEvents,
  timeRange,
  hasRealTime,
}: TimelineStatsProps) {
  const duration = timeRange.end - timeRange.start;

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-4 rounded border border-border bg-bg-secondary/95 px-3 py-1.5 font-mono text-[11px] text-text-secondary">
      <div>
        <span className="text-sky-400">{visibleEvents.toLocaleString()}</span>
        <span className="ml-1">/ {totalEvents.toLocaleString()} 事件</span>
      </div>
      <div>
        时段 {formatDuration(duration)}
        {!hasRealTime && ' · 按行序模拟时间'}
      </div>
    </div>
  );
}
