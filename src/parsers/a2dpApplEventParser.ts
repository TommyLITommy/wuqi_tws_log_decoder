import type { LogParser, ParseResult } from '@/types';
import { extractA2dpApplEvent, A2DP_APPL_EVENT_RE } from '@/share/a2dpApplEventMap';

function severityForA2dpApplEvent(event: number, result: number): ParseResult['severity'] {
  if (result !== 0) return 'error';
  if (event === 0x01 || event === 0x06 || event === 0x08) return 'success';
  if (event === 0x02 || event === 0x07 || event === 0x04 || event === 0x0A) return 'info';
  if (event === 0x0B) return 'info';
  return 'info';
}

export const a2dpApplEventParser: LogParser = {
  name: 'A2dpApplEventParser',
  pattern: A2DP_APPL_EVENT_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const info = extractA2dpApplEvent(line);
    if (!info) return null;

    return {
      badge: 'a2dp',
      rawValue: `0x${info.event.toString(16).toUpperCase().padStart(2, '0')}`,
      name: info.eventName,
      desc: [
        `Event:0x${info.event.toString(16).toUpperCase()}`,
        `Instance:${info.instance}`,
        `Result:0x${info.result.toString(16).toUpperCase().padStart(4, '0')}`,
        `Data:${info.data.toUpperCase()}`,
        `DataLength:${info.dataLength}`,
      ].join(' '),
      severity: severityForA2dpApplEvent(info.event, info.result),
    };
  },
};
