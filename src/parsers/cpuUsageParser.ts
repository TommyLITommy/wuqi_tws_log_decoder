import type { LogParser, ParseResult } from '@/types';
import { extractCpuIdlePercent } from '@/share/cpuUsageLog';
import { getLogCoreType } from '@/share/logCore';

export const CPU_USAGE_RE = /cpu_usage->[\s\S]*?\d+\s+IDLE\s+\d+\s+\d+%/;

export const cpuUsageParser: LogParser = {
  name: 'CpuUsageParser',
  pattern: CPU_USAGE_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const idle = extractCpuIdlePercent(line);
    if (idle === null) return null;

    const core = getLogCoreType(line);
    const coreLabel = core ?? '?';

    return {
      badge: 'status',
      rawValue: `${idle}%`,
      name: `CPU ${coreLabel} IDLE`,
      desc: `核 ${coreLabel} 空闲率 ${idle}%`,
      severity: idle >= 50 ? 'success' : idle >= 30 ? 'warning' : 'error',
    };
  },
};
