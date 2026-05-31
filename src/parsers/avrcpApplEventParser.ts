import type { LogParser, ParseResult } from '@/types';
import {
  extractAvrcpApplEvent,
  formatBdAddr,
  AVRCP_APPL_EVENT_RE,
} from '@/share/avrcpApplEventMap';

function severityForAvrcpApplEvent(event: number, result: number): ParseResult['severity'] {
  if (result !== 0) return 'error';
  if (event === 0x02 || event === 0x21) return 'success';
  if (event === 0x01 || event === 0x20) return 'info';
  if (event === 0x03 || event === 0x04 || event === 0x22 || event === 0x23) return 'info';
  return 'info';
}

export const avrcpApplEventParser: LogParser = {
  name: 'AvrcpApplEventParser',
  pattern: AVRCP_APPL_EVENT_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const info = extractAvrcpApplEvent(line);
    if (!info) return null;

    return {
      badge: 'a2dp',
      rawValue: `0x${info.event.toString(16).toUpperCase().padStart(2, '0')}`,
      name: info.eventName,
      desc: [
        `Event:0x${info.event.toString(16).toUpperCase()}`,
        `Result:0x${info.result.toString(16).toUpperCase().padStart(4, '0')}`,
        `Instance:${info.instance}`,
        `BD_ADDR:${formatBdAddr(info.bdAddr)}`,
      ].join(' '),
      severity: severityForAvrcpApplEvent(info.event, info.result),
    };
  },
};
