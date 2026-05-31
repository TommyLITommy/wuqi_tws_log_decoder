import type { LogParser, ParseResult } from '@/types';
import { HFP_STATE_CHANGE_RE, getHfpStateName } from '@/share/hfpStateMap';

function severityForHfpState(state: number): ParseResult['severity'] {
  if (state >= 4 && state <= 9) return 'warning';
  if (state === 3) return 'success';
  if (state <= 1) return 'info';
  return 'warning';
}

export const hfpStateParser: LogParser = {
  name: 'HfpStateChangeParser',
  pattern: HFP_STATE_CHANGE_RE,

  parse(match: RegExpMatchArray): ParseResult | null {
    const oldState = parseInt(match[1], 10);
    const newState = parseInt(match[2], 10);
    const index = match[3];
    const primary = match[4];

    let desc = `${getHfpStateName(oldState)} => ${getHfpStateName(newState)}`;
    if (index !== undefined) desc += ` index:${index}`;
    if (primary !== undefined) desc += ` primary:${primary}`;

    return {
      badge: 'profile',
      rawValue: `${oldState}=>${newState}`,
      name: 'HFP_STATE_CHANGED',
      desc,
      severity: severityForHfpState(newState),
    };
  },
};
