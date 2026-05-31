import type { LogParser, ParseResult } from '@/types';
import { extractLinkKey, LINK_KEY_RE } from '@/share/linkKeyLog';

export const linkKeyParser: LogParser = {
  name: 'LinkKeyParser',
  pattern: LINK_KEY_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const linkKey = extractLinkKey(line);
    if (!linkKey) return null;

    return {
      badge: 'hci',
      rawValue: linkKey.replace(/\s+/g, ''),
      name: 'LINK_KEY',
      desc: `Link_Key: ${linkKey}`,
      severity: 'info',
    };
  },
};
