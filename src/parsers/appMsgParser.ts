import type { LogParser, ParseResult } from '@/types';
import { getMsgString } from '../share/msgTypeMap';

export const appMsgParser: LogParser = {
  name: 'AppMsgParser',
  pattern: /handle_msg running is too long, type:(\d+)\s+id:(\d+)\s+run_us:(\d+)/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    const typeId = parseInt(match[1], 10);
    const msgId = parseInt(match[2], 10);
    const runUs = match[3];
    
    const msgStr = getMsgString(typeId, msgId);
    
    return {
      badge: 'appmsg',
      rawValue: `type=${typeId} id=${msgId}`,
      name: msgStr,
      desc: `run_us=${runUs}`,
      severity: parseInt(runUs, 10) > 5000 ? 'warning' : 'info',
    };
  }
};