import type { LogParser, ParseResult } from '@/types';
import { extractHfpApplEvent, HFP_APPL_EVENT_RE } from '@/share/hfpApplEventMap';

function severityForHfpApplEvent(event: number, result: number): ParseResult['severity'] {
  if (result !== 0) return 'error';
  if (event === 0x21) return 'error';
  if (event >= 0x11 && event <= 0x1C) return 'warning';
  if (event === 0x02 || event === 0x01) return 'success';
  if (event === 0x03 || event === 0x04) return 'info';
  return 'info';
}

export const hfpApplEventParser: LogParser = {
  name: 'HfpApplEventParser',
  pattern: HFP_APPL_EVENT_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const info = extractHfpApplEvent(line);
    if (!info) return null;

    return {
      badge: 'profile',
      rawValue: `0x${info.event.toString(16).toUpperCase().padStart(2, '0')}`,
      name: info.eventName,
      desc: `Event:0x${info.event.toString(16).toUpperCase()} Instance:${info.instance} result:0x${info.result.toString(16).toUpperCase().padStart(4, '0')}`,
      severity: severityForHfpApplEvent(info.event, info.result),
    };
  },
};
