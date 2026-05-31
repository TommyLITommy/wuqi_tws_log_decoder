import type { LogParser, ParseResult } from '@/types';
import {
  extractWwsRssi,
  formatRssiDbm,
  WWS_RSSI_RE,
} from '@/share/wwsRssiLog';

export const wwsRssiParser: LogParser = {
  name: 'WwsRssiParser',
  pattern: WWS_RSSI_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const info = extractWwsRssi(line);
    if (!info) return null;

    return {
      badge: 'status',
      rawValue: `${info.phoneRssi}/${info.wwsRssi}`,
      name: 'WWS_RSSI',
      desc: `phone_rssi:${formatRssiDbm(info.phoneRssi)} wws_rssi:${formatRssiDbm(info.wwsRssi)} crc_err:${info.crcErr} seq_err:${info.seqErr}`,
      severity: info.crcErr > 0 || info.seqErr > 0 ? 'warning' : 'info',
    };
  },
};
