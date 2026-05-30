import type { LogParser, ParseResult } from '@/types';
import { decodeState } from '../share/stateBitMap';

export const stateChangeParser: LogParser = {
  name: 'EvtsysStateChangeParser',
  pattern: /(?:EVTSYS_STATE_CHANGED|sys_state)\s+(0x[0-9a-fA-F]+)\s*->\s*(0x[0-9a-fA-F]+)/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    const oldVal = parseInt(match[1], 16);
    const newVal = parseInt(match[2], 16);
    
    const oldStates = decodeState(oldVal);
    const newStates = decodeState(newVal);
    
    return {
      badge: 'state',
      rawValue: `0x${oldVal.toString(16).toUpperCase()}->0x${newVal.toString(16).toUpperCase()}`,
      name: 'StateChanged',
      desc: `[${oldStates.join(', ')}] → [${newStates.join(', ')}]`,
      severity: 'info',
    };
  }
};