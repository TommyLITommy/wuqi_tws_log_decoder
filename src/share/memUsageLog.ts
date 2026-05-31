import { getLogCoreType } from '@/share/logCore';
import type { CoreMemoryInfo, DeviceStatusSnapshot } from '@/types';

export const MEM_USAGE_RE = /Core\d+:\s*Mem\s+total:(\d+)B\s+free:(\d+)B\s+lowest:(\d+)B/i;

export function extractMemUsage(raw: string): CoreMemoryInfo | null {
  const match = MEM_USAGE_RE.exec(raw);
  if (!match) return null;

  const total = parseInt(match[1], 10);
  const free = parseInt(match[2], 10);
  const lowest = parseInt(match[3], 10);
  if ([total, free, lowest].some(v => Number.isNaN(v) || v < 0)) return null;
  if (free > total) return null;

  return { total, free, lowest };
}

export function memInfoEqual(a: CoreMemoryInfo | null, b: CoreMemoryInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.total === b.total && a.free === b.free && a.lowest === b.lowest;
}

export function applyMemUsageLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const mem = extractMemUsage(raw);
  if (!mem) return;

  const core = getLogCoreType(raw);
  if (!core) return;

  if (core === 'A') snapshot.memA = mem;
  else if (core === 'B') snapshot.memB = mem;
  else snapshot.memD = mem;

  const usedPct = Math.round((1 - mem.free / mem.total) * 100);
  snapshot.lastEvent = `Mem ${core} used=${usedPct}% free=${mem.free}B`;
}
