import type { LogParser, ParseResult } from '@/types';
import { extractMemUsage, MEM_USAGE_RE } from '@/share/memUsageLog';
import { getLogCoreType } from '@/share/logCore';

export const memUsageParser: LogParser = {
  name: 'MemUsageParser',
  pattern: MEM_USAGE_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const mem = extractMemUsage(line);
    if (!mem) return null;

    const core = getLogCoreType(line);
    const coreLabel = core ?? '?';
    const usedPct = Math.round((1 - mem.free / mem.total) * 100);

    return {
      badge: 'status',
      rawValue: `${usedPct}%`,
      name: `Mem ${coreLabel}`,
      desc: `核 ${coreLabel} 内存 total:${mem.total}B free:${mem.free}B lowest:${mem.lowest}B`,
      severity: usedPct <= 50 ? 'success' : usedPct <= 75 ? 'warning' : 'error',
    };
  },
};
