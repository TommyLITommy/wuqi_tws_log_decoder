import { useCallback, useMemo } from 'react';
import type { LogEvent } from '@/types';
import { TIMELINE_HEADER_H, TIMELINE_ROW_H, TIMELINE_TRACK_COUNT } from '@/components/Timeline/timelineLayout';

const TRACK_ORDER = ['异常断连', '音乐播放', '连接手机', '打电话', '入盒时刻'] as const;

export function useTimeline(
  events: LogEvent[],
  disabledEventTypes: Set<string>,
  hasRealTime: boolean,
  fallbackTimeRange?: { start: number; end: number }
) {
  const headerHeight = TIMELINE_HEADER_H;
  const trackHeight = TIMELINE_ROW_H;

  const tracks = useMemo(() => {
    const map: Record<string, number> = {};
    TRACK_ORDER.forEach((label, index) => {
      map[label] = index;
    });
    return map;
  }, []);

  const trackCount = TIMELINE_TRACK_COUNT;

  const timeRange = useMemo(() => {
    if (events.length === 0) {
      if (fallbackTimeRange && fallbackTimeRange.end > fallbackTimeRange.start) {
        return fallbackTimeRange;
      }
      return { start: 0, end: 1 };
    }
    let start = Infinity;
    let end = -Infinity;
    for (const event of events) {
      start = Math.min(start, event.timestamp);
      end = Math.max(end, event.timestamp);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return { start: 0, end: 1 };
    }
    if (start === end) end = start + 1;
    return { start, end };
  }, [events, fallbackTimeRange]);

  const allEvents = events;
  const visibleEvents = useMemo(
    () => events.filter(event => !disabledEventTypes.has(event.type)),
    [events, disabledEventTypes]
  );

  const getTrackIndex = useCallback(
    (type: string) => tracks[type] ?? -1,
    [tracks]
  );

  const getTrackCount = useCallback(() => trackCount, [trackCount]);

  return {
    timeRange,
    tracks,
    trackHeight,
    headerHeight,
    getTrackIndex,
    getTrackCount,
    visibleEvents,
    allEvents,
    hasRealTime,
    trackOrder: TRACK_ORDER,
  };
}
