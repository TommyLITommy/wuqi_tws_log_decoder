import { CM_CONNECTED_RE, CM_DISCONNECTED_RE } from '@/share/multipointLog';
import type { LogEvent } from '@/types';
import { buildLogTimeIndex, type LogTimeIndex } from '@/utils/logTimestamp';

export type TimelineTrackId =
  | 'abnormal_disconnect'
  | 'music_play'
  | 'phone_connect'
  | 'phone_call'
  | 'in_box';

export interface TimelineMarker {
  lineIndex: number;
  timeMs: number;
  title: string;
}

export interface TimelineTrackDef {
  id: TimelineTrackId;
  label: string;
  shortIcon: string;
  rowClass: string;
  markerClass: string;
}

export interface TimelineTrack extends TimelineTrackDef {
  markers: TimelineMarker[];
}

export interface TwsEventTimeline {
  timeIndex: LogTimeIndex;
  tracks: TimelineTrack[];
  totalMarkers: number;
}

export const TIMELINE_TRACK_DEFS: TimelineTrackDef[] = [
  {
    id: 'abnormal_disconnect',
    label: '异常断连',
    shortIcon: '!',
    rowClass: 'text-orange-400',
    markerClass: 'bg-orange-500 border-orange-300/80 text-white',
  },
  {
    id: 'music_play',
    label: '音乐播放',
    shortIcon: '♪',
    rowClass: 'text-violet-400',
    markerClass: 'bg-violet-500 border-violet-300/80 text-white',
  },
  {
    id: 'phone_connect',
    label: '连接手机',
    shortIcon: '▣',
    rowClass: 'text-teal-400',
    markerClass: 'bg-teal-500 border-teal-300/80 text-white',
  },
  {
    id: 'phone_call',
    label: '打电话',
    shortIcon: '☎',
    rowClass: 'text-pink-400',
    markerClass: 'bg-pink-500 border-pink-300/80 text-white',
  },
  {
    id: 'in_box',
    label: '入盒时刻',
    shortIcon: '⌂',
    rowClass: 'text-amber-200/90',
    markerClass: 'bg-amber-600/90 border-amber-300/70 text-white',
  },
];

const ABNORMAL_DISCONNECT_RE =
  /EVTSYS_(?:DISCONNECTED|LINK_LOSS|WWS_DISCONNECTED|A2DP_DISCONNECTED|HFP_DISCONNECTED|LINK_LOSS_RECONNECT_FAILED)|CM_disconnected|BT_CMD_(?:DISCONNECT|A2DP_DISCONNECT|HFP_DISCONNECT|AVRCP_DISCONNECT|L2CAP_DISCONNECT)|LINK_LOSS|link_loss|断连/i;

const MUSIC_PLAY_RE =
  /EVTSYS_MUSIC_PLAY|A2DP_STATE_STREAMING|A2DP.*(?:STREAM|streaming)|music\s*play|开始播放/i;

const PHONE_CONNECT_RE =
  /EVTSYS_CONNECTED|CM_connected|BT_CMD_CONNECT\b|PROFILE_CONNECT|BT_CMD_A2DP_CONNECT|BT_CMD_HFP_CONNECT/i;

const PHONE_CALL_RE =
  /EVTSYS_(?:RING|SCOLINK_OPEN)|HFP.*(?:IN.?CALL|CALL)|正在通话|incoming call/i;

const IN_BOX_RE =
  /EVTSYS_(?:PUT_IN|CMC_BOX_CLOSE)|CHARGER_MSG_ID_REMOTE_DATA_IN_BOX|入盒|in[_\s]?box|box_close/i;

function pushMarker(
  bucket: TimelineMarker[],
  lineIndex: number,
  timeMs: number,
  title: string
) {
  bucket.push({ lineIndex, timeMs, title });
}

function classifyLine(raw: string): { track: TimelineTrackId; title: string } | null {
  if (ABNORMAL_DISCONNECT_RE.test(raw)) {
    return { track: 'abnormal_disconnect', title: raw.slice(0, 120) };
  }
  if (MUSIC_PLAY_RE.test(raw)) {
    return { track: 'music_play', title: raw.slice(0, 120) };
  }
  if (PHONE_CONNECT_RE.test(raw)) {
    return { track: 'phone_connect', title: raw.slice(0, 120) };
  }
  if (PHONE_CALL_RE.test(raw)) {
    return { track: 'phone_call', title: raw.slice(0, 120) };
  }
  if (IN_BOX_RE.test(raw)) {
    return { track: 'in_box', title: raw.slice(0, 120) };
  }
  if (CM_CONNECTED_RE.test(raw)) {
    return { track: 'phone_connect', title: raw.slice(0, 120) };
  }
  if (CM_DISCONNECTED_RE.test(raw)) {
    return { track: 'abnormal_disconnect', title: raw.slice(0, 120) };
  }
  return null;
}

export function buildTwsEventTimeline(logLines: string[]): TwsEventTimeline {
  const timeIndex = buildLogTimeIndex(logLines);
  const buckets: Record<TimelineTrackId, TimelineMarker[]> = {
    abnormal_disconnect: [],
    music_play: [],
    phone_connect: [],
    phone_call: [],
    in_box: [],
  };

  for (let i = 0; i < logLines.length; i++) {
    const raw = logLines[i];
    const hit = classifyLine(raw);
    if (!hit) continue;
    pushMarker(buckets[hit.track], i, timeIndex.lineTimesMs[i], hit.title);
  }

  const tracks: TimelineTrack[] = TIMELINE_TRACK_DEFS.map(def => ({
    ...def,
    markers: buckets[def.id],
  }));

  const totalMarkers = tracks.reduce((sum, t) => sum + t.markers.length, 0);
  return { timeIndex, tracks, totalMarkers };
}

export function findActiveMarkerLine(
  lineTimesMs: number[],
  viewportLineIndex: number
): number {
  if (lineTimesMs.length === 0) return 0;
  const clamped = Math.max(0, Math.min(viewportLineIndex, lineTimesMs.length - 1));
  return lineTimesMs[clamped];
}

const TRACK_EVENT_META: Record<
  TimelineTrackId,
  Pick<LogEvent, 'type' | 'color' | 'icon'>
> = {
  abnormal_disconnect: { type: '异常断连', color: '#f97316', icon: '!' },
  music_play: { type: '音乐播放', color: '#a855f7', icon: '♪' },
  phone_connect: { type: '连接手机', color: '#14b8a6', icon: '▣' },
  phone_call: { type: '打电话', color: '#ec4899', icon: '☎' },
  in_box: { type: '入盒时刻', color: '#d97706', icon: '⌂' },
};

export interface LogEventsBundle {
  events: LogEvent[];
  hasRealTime: boolean;
  lineTimesMs: number[];
  timeMinMs: number;
  timeMaxMs: number;
}

export function buildLogEvents(logLines: string[]): LogEventsBundle {
  const model = buildTwsEventTimeline(logLines);
  const events: LogEvent[] = [];

  for (const track of model.tracks) {
    const meta = TRACK_EVENT_META[track.id];
    for (const marker of track.markers) {
      events.push({
        id: `${track.id}-${marker.lineIndex}`,
        type: meta.type,
        timestamp: marker.timeMs,
        lineIndex: marker.lineIndex,
        color: meta.color,
        icon: meta.icon,
        description: marker.title,
      });
    }
  }

  events.sort((a, b) => a.timestamp - b.timestamp || a.lineIndex - b.lineIndex);

  return {
    events,
    hasRealTime: model.timeIndex.hasRealTime,
    lineTimesMs: model.timeIndex.lineTimesMs,
    timeMinMs: model.timeIndex.timeMinMs,
    timeMaxMs: model.timeIndex.timeMaxMs,
  };
}
