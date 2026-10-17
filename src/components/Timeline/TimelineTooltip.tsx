import { createPortal } from 'react-dom';
import type { LogEvent } from '@/types';

interface TimelineTooltipProps {
  event: LogEvent | null;
  x: number;
  y: number;
  visible: boolean;
}

export function TimelineTooltip({ event, x, y, visible }: TimelineTooltipProps) {
  if (!visible || !event) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] max-w-sm rounded border border-border bg-bg-secondary/95 px-2 py-1.5 text-[11px] shadow-lg"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="font-medium text-text-primary">
        {event.icon} {event.type} · L{event.lineIndex + 1}
      </div>
      {event.description && (
        <div className="mt-0.5 line-clamp-3 text-text-secondary">{event.description}</div>
      )}
    </div>,
    document.body
  );
}
