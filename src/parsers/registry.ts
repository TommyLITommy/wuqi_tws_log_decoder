import type { LogParser, ParseResult } from '@/types';
import { rpcParser } from './rpcParser';
import { hciParser } from './hciParser';
import { statusParser } from './statusParser';
import { appCmdParser } from './appCmdParser';
import { btnMsgParser } from './btnMsgParser';
import { appMsgParser } from './appMsgParser';
import { stateChangeParser } from './stateChangeParser';

// ========== 所有解析器注册在这里 ==========
export const parserRegistry: LogParser[] = [
  rpcParser,        // 蓝牙RPC命令
  hciParser,        // HCI事件
  statusParser,     // 状态码
  appCmdParser,     // APP命令
  btnMsgParser,     // 按钮消息
  appMsgParser,     // APP消息处理
  stateChangeParser, // 系统状态变更
  // 添加新解析器...
];

/**
 * 对单行日志执行所有解析器，返回第一个匹配结果
 */
export function parseLogLine(line: string): ParseResult | null {
  for (const parser of parserRegistry) {
    const match = parser.pattern.exec(line);
    if (match) {
      const result = parser.parse(match, line);
      if (result) return result;
    }
  }
  return null;
}

/**
 * 批量解析
 */
export function parseAllLogs(lines: string[]): ParseResult[] {
  const results: ParseResult[] = [];
  for (const line of lines) {
    const result = parseLogLine(line);
    if (result) results.push(result);
  }
  return results;
}