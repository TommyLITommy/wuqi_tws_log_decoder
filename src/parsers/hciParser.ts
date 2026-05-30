import type { LogParser, ParseResult } from '@/types';
import { getHciCmdStringByOpcode, getHciErrorString } from '../share/hciCodes';

export const hciParser: LogParser = {
  name: 'HciLogParser',
  pattern: /HCI_([A-Z_]+)_EVENT\.\s*.*?Opcode:\s*(0x[0-9A-Fa-f]{4}|[0-9A-Fa-f]{4}).*?Status:\s*(0x[0-9A-Fa-f]{1,2}|[0-9A-Fa-f]{1,2})/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    const eventType = match[1];
    let opcodeStr = match[2];
    let statusStr = match[3];
    
    if (!opcodeStr.startsWith('0x')) opcodeStr = '0x' + opcodeStr;
    if (!statusStr.startsWith('0x')) statusStr = '0x' + statusStr;
    
    const opcode = parseInt(opcodeStr, 16);
    const status = parseInt(statusStr, 16);
    
    const cmdName = getHciCmdStringByOpcode(opcode);
    const statusName = getHciErrorString(status);
    
    return {
      badge: 'hci',
      rawValue: `0x${opcode.toString(16).toUpperCase().padStart(4, '0')}`,
      name: cmdName,
      desc: `${eventType} | Status: ${statusName}`,
      severity: status !== 0x00 ? 'error' : 'info',
    };
  }
};