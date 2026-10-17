import type { LogEvent } from '@/types';
import { TIMELINE_LABEL_W } from '@/components/Timeline/timelineLayout';

interface TimelineLegendProps {
  trackOrder: readonly string[];
  typeCounts: Record<string, number>;
  allEvents: LogEvent[];
  disabledEventTypes: Set<string>;
  onToggleType: (type: string) => void;
  axisHeight: number;
  rowHeight: number;
  highlightedType?: string | null;
}

export function TimelineLegend({
  trackOrder,
  typeCounts,
  allEvents,
  disabledEventTypes,
  onToggleType,
  axisHeight,
  rowHeight,
  highlightedType = null,
}: TimelineLegendProps) {
  return (
    <div
      className="shrink-0 border-r border-border/60 bg-bg-secondary/50"
      style={{ width: TIMELINE_LABEL_W }}
    >
      <div className="border-b border-border/40" style={{ height: axisHeight }} />
      {trackOrder.map(type => {
        const sample = allEvents.find(event => event.type === type);
        const count = typeCounts[type] || 0;
        const disabled = disabledEventTypes.has(type);
        const highlighted = highlightedType === type;
        const color = sample?.color ?? '#94a3b8';
        const icon = sample?.icon ?? '●';

        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleType(type)}
            className={[
              'flex w-full items-center gap-2 border-b border-border/30 px-2 text-left text-[11px] transition-colors',
              highlighted ? 'bg-sky-400/15 ring-1 ring-inset ring-sky-400/40' : 'hover:bg-bg-secondary/80',
              disabled ? 'opacity-35' : 'opacity-100',
            ].join(' ')}
            style={{ height: rowHeight }}
            title={disabled ? '点击显示此类事件' : '点击隐藏此类事件'}
          >
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
              style={{
                backgroundColor: `${color}22`,
                color,
                border: `1px solid ${color}66`,
              }}
            >
              {icon}
            </span>
            <span className="truncate text-text-primary">{type}</span>
            <span className="ml-auto tabular-nums text-text-secondary">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

export { TIMELINE_LABEL_W } from '@/components/Timeline/timelineLayout';
