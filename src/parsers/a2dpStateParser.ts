import type { LogParser, ParseResult } from '@/types';
import { A2DP_STATE_CHANGE_RE, getA2dpStateName } from '../share/a2dpStateMap';

export const a2dpStateParser: LogParser = {
  name: 'A2dpStateChangeParser',
  pattern: A2DP_STATE_CHANGE_RE,

  parse(match: RegExpMatchArray): ParseResult | null {
    const oldState = parseInt(match[1], 10);
    const newState = parseInt(match[2], 10);
    const index = match[3];
    const primary = match[4];

    let desc = `${getA2dpStateName(oldState)} => ${getA2dpStateName(newState)}`;
    if (index !== undefined) desc += ` index:${index}`;
    if (primary !== undefined) desc += ` primary:${primary}`;

    return {
      badge: 'a2dp',
      rawValue: `${oldState}=>${newState}`,
      name: 'A2DP_STATE_CHANGED',
      desc,
      severity: newState >= 3 ? 'success' : newState <= 1 ? 'info' : 'warning',
    };
  },
};
