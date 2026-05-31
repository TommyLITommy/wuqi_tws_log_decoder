import { getLogCoreType } from '@/share/logCore';
import type { DeviceStatusSnapshot } from '@/types';

const CPU_USAGE_RE = /cpu_usage->/;
const CPU_IDLE_RE = /\d+\s+IDLE\s+\d+\s+(\d+)%/;

export function extractCpuIdlePercent(raw: string): number | null {
  if (!CPU_USAGE_RE.test(raw)) return null;
  const match = CPU_IDLE_RE.exec(raw);
  if (!match) return null;
  const percent = parseInt(match[1], 10);
  if (Number.isNaN(percent) || percent < 0 || percent > 100) return null;
  return percent;
}

export function applyCpuUsageLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const idle = extractCpuIdlePercent(raw);
  if (idle === null) return;

  const core = getLogCoreType(raw);
  if (!core) return;

  if (core === 'A') snapshot.cpuIdleA = idle;
  else if (core === 'B') snapshot.cpuIdleB = idle;
  else snapshot.cpuIdleD = idle;

  snapshot.lastEvent = `CPU ${core} IDLE=${idle}%`;
}
