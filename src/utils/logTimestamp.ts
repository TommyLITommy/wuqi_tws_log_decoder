const TIME_TOKEN_RE = /(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/;

export function parseClockMsFromLine(line: string): number | null {
  const match = TIME_TOKEN_RE.exec(line);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const frac = match[4] ? Number(match[4].padEnd(3, '0')) : 0;
  return ((hours * 3600 + minutes * 60 + seconds) * 1000 + frac);
}

export interface LogTimeIndex {
  /** 每行对应的时间轴毫秒值（单调递增） */
  lineTimesMs: number[];
  hasRealTime: boolean;
  timeMinMs: number;
  timeMaxMs: number;
}

const FALLBACK_MS_PER_LINE = 8;

/** 为整份日志构建行级时间索引；无时间戳时用行号模拟时间轴 */
export function buildLogTimeIndex(logLines: string[]): LogTimeIndex {
  const lineTimesMs: number[] = new Array(logLines.length);
  let hasRealTime = false;
  let lastRealMs: number | null = null;
  let dayOffset = 0;

  for (let i = 0; i < logLines.length; i++) {
    const parsed = parseClockMsFromLine(logLines[i]);
    if (parsed !== null) {
      hasRealTime = true;
      let ms = parsed + dayOffset;
      if (lastRealMs !== null && ms < lastRealMs - 12 * 3600 * 1000) {
        dayOffset += 24 * 3600 * 1000;
        ms = parsed + dayOffset;
      }
      lineTimesMs[i] = ms;
      lastRealMs = ms;
    } else {
      const prev = i > 0 ? lineTimesMs[i - 1] : 0;
      lineTimesMs[i] = prev + FALLBACK_MS_PER_LINE;
    }
  }

  if (logLines.length === 0) {
    return { lineTimesMs, hasRealTime: false, timeMinMs: 0, timeMaxMs: 0 };
  }

  const timeMinMs = lineTimesMs[0];
  const timeMaxMs = lineTimesMs[logLines.length - 1];
  return { lineTimesMs, hasRealTime, timeMinMs, timeMaxMs };
}

export function formatTimelineClock(ms: number, hasRealTime: boolean): string {
  if (hasRealTime) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600) % 24;
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function findLineIndexAtTime(lineTimesMs: number[], timeMs: number): number {
  if (lineTimesMs.length === 0) return 0;
  let lo = 0;
  let hi = lineTimesMs.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (lineTimesMs[mid] < timeMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
