import type { LogParser, ParseResult } from '@/types';
import {
  PROFILE_CONNECT_CM_RE,
  PROFILE_CONNECT_IND_SIG_RE,
  decodeTdsProfileFlags,
  parseProfileConnectFlags,
} from '../share/tdsProfileFlag';

export const profileConnectParser: LogParser = {
  name: 'ProfileConnectIndParser',
  pattern: PROFILE_CONNECT_IND_SIG_RE,

  parse(match: RegExpMatchArray, line: string): ParseResult | null {
    const { peProfileFlag, meProfileFlag } = parseProfileConnectFlags(match);
    const peProfiles = decodeTdsProfileFlags(peProfileFlag);
    const meProfiles = decodeTdsProfileFlags(meProfileFlag);

    let desc =
      `pe->profile_flag=0x${peProfileFlag.toString(16).toUpperCase().padStart(2, '0')} [${peProfiles.join(', ')}] ` +
      `me->profile_flag=0x${meProfileFlag.toString(16).toUpperCase().padStart(2, '0')} [${meProfiles.join(', ')}]`;

    const cmMatch = PROFILE_CONNECT_CM_RE.exec(line);
    if (cmMatch) {
      desc = `[CM:${cmMatch[1]}, ${cmMatch[2].toUpperCase()}] ${desc}`;
    }

    return {
      badge: 'profile',
      rawValue: `${match[1]} ${match[2]}`,
      name: 'PROFILE_CONNECT_IND_SIG',
      desc,
      severity: 'success',
    };
  },
};
