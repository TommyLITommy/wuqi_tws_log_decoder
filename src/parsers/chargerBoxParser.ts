import type { LogParser, ParseResult } from '@/types';
import { extractChargerBoxInit, CHARGER_BOX_INIT_RE } from '@/share/chargerBoxLog';

function severityForBootReason(reason: number, ret: number): ParseResult['severity'] {
  if (ret !== 0) return 'error';
  if (reason === 3 || reason === 5) return 'warning';
  if (reason === 1 || reason === 2 || reason === 4) return 'info';
  return 'info';
}

export const chargerBoxParser: LogParser = {
  name: 'ChargerBoxParser',
  pattern: CHARGER_BOX_INIT_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const info = extractChargerBoxInit(line);
    if (!info) return null;

    return {
      badge: 'status',
      rawValue: String(info.bootReason),
      name: info.bootReasonName,
      desc: `boot_reason:${info.bootReasonName} src:${info.src} flag:${info.flag} ret:${info.ret}`,
      severity: severityForBootReason(info.bootReason, info.ret),
    };
  },
};
