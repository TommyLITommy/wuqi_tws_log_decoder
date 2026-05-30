import type { LogParser, ParseResult } from '@/types';
import { getAppCmdName } from '../share/appCmdMap';

export const appCmdParser: LogParser = {
  name: 'UserAppCmdParser',
  // 支持两种格式：bluetx字节流 和 app_cmd文本
  pattern: /(?:>\[bluetx\]3b,5f,[0-9a-fA-F]{2},([0-9a-fA-F]{2}),([0-9a-fA-F]{2})|\[app_cmd\][^\n]*?group\s*=\s*([0-9a-fA-F]+)\s+sub_id\s*=\s*([0-9a-fA-F]+))/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    let groupHex: string;
    let subHex: string;
    
    if (match[1] !== undefined) {
      // 格式1: bluetx
      groupHex = match[1];
      subHex = match[2];
    } else {
      // 格式2: app_cmd
      groupHex = match[3];
      subHex = match[4];
    }
    
    const groupId = parseInt(groupHex, 16);
    const subId = parseInt(subHex, 16);
    const cmdName = getAppCmdName(groupId, subId);
    
    return {
      badge: 'appcmd',
      rawValue: `0x${groupId.toString(16).toUpperCase().padStart(2, '0')}/0x${subId.toString(16).toUpperCase().padStart(2, '0')}`,
      name: cmdName,
      desc: `group=${groupId} sub=${subId}`,
      severity: cmdName.startsWith('unknown') ? 'warning' : 'info',
    };
  }
};