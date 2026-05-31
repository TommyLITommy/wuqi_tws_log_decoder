import type { LogParser, ParseResult } from '@/types';
import { rpcParser } from './rpcParser';
import { hciParser } from './hciParser';
import { statusParser } from './statusParser';
import { appCmdParser } from './appCmdParser';
import { btnMsgParser } from './btnMsgParser';
import { appMsgParser } from './appMsgParser';
import { stateChangeParser } from './stateChangeParser';
import { a2dpStateParser } from './a2dpStateParser';
import { a2dpApplEventParser } from './a2dpApplEventParser';
import { hfpStateParser } from './hfpStateParser';
import { hfpApplEventParser } from './hfpApplEventParser';
import { avrcpApplEventParser } from './avrcpApplEventParser';
import { profileConnectParser } from './profileConnectParser';
import { cpuUsageParser } from './cpuUsageParser';
import { memUsageParser } from './memUsageParser';
import { featResParser } from './featResParser';
import { trafficParser } from './trafficParser';
import { batteryParser } from './batteryParser';
import { linkKeyParser } from './linkKeyParser';
import { mtuParser } from './mtuParser';
import { chargerBoxParser } from './chargerBoxParser';
import { wwsRssiParser } from './wwsRssiParser';
import { wwsRoleChangedParser } from './wwsRoleChangedParser';

// ========== 所有解析器注册在这里 ==========
export const parserRegistry: LogParser[] = [
  rpcParser,        // 蓝牙RPC命令
  hciParser,        // HCI事件
  a2dpStateParser,  // A2DP 状态变更
  a2dpApplEventParser, // A2DP APPL Event
  hfpStateParser,   // HFP 状态变更
  hfpApplEventParser, // HFP APPL Event
  avrcpApplEventParser, // AVRCP APPL Event
  profileConnectParser, // TDS Profile 连接指示
  cpuUsageParser,   // CPU IDLE 使用率
  memUsageParser,   // 内存使用情况
  featResParser,    // 功能模块资源
  trafficParser,    // SCO/Traffic 流量
  batteryParser,    // 电池电量/电压
  linkKeyParser,    // Link Key
  mtuParser,        // GATT MTU
  chargerBoxParser, // 充电盒初始化
  wwsRssiParser,    // WWS RSSI
  wwsRoleChangedParser, // WWS 主从切换
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