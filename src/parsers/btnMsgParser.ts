import type { LogParser, ParseResult } from '@/types';
import { getKeyFunName } from '../share/btnMsgMap';

export const btnMsgParser: LogParser = {
  name: 'UserBtnMsgParser',
  pattern: /slave\s+btn\s+msg_id:\s*(\d+)\s*,\s*param_len:\s*(\d+)\s*,\s*param:\s*(\d+)/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    const msgId = parseInt(match[1], 10);
    const paramLen = match[2];
    const param = match[3];
    
    const funName = getKeyFunName(msgId);
    
    return {
      badge: 'btn',
      rawValue: `msg_id=${msgId}`,
      name: funName,
      desc: `param_len=${paramLen} param=${param}`,
      severity: 'info',
    };
  }
};