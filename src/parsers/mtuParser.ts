import type { LogParser, ParseResult } from '@/types';
import { extractMtu, MTU_CHANGED_RE } from '@/share/mtuLog';

export const mtuParser: LogParser = {
  name: 'MtuParser',
  pattern: MTU_CHANGED_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const mtu = extractMtu(line);
    if (mtu === null) return null;

    return {
      badge: 'hci',
      rawValue: String(mtu),
      name: 'GATT_MTU',
      desc: `gatt mtu changed to ${mtu}`,
      severity: 'info',
    };
  },
};
