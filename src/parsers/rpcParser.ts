import type { LogParser, ParseResult } from '@/types';
import { BT_RPC_MODULE, MODULE_CMD_TABLES, buildCmdId } from '../share/rpcTables';
import { getWqRetName } from '../share/wqErrorCodes';

// 预构建查找表
const CMD_ID_TO_INFO = new Map<number, { name: string; module: string; index: number }>();
const MODULE_ID_TO_NAME: Record<number, string> = {};

(function init() {
  for (const [moduleName, moduleId] of Object.entries(BT_RPC_MODULE)) {
    MODULE_ID_TO_NAME[moduleId] = moduleName;
    const cmdTable = MODULE_CMD_TABLES[moduleName] || [];
    for (const cmd of cmdTable) {
      const cmdId = buildCmdId(moduleId, cmd.index);
      CMD_ID_TO_INFO.set(cmdId, { name: cmd.name, module: moduleName, index: cmd.index });
    }
  }
})();

export const rpcParser: LogParser = {
  name: 'BtRpcCmdParser',
  pattern: /wq_send_rpc_cmd\s+([0-9A-Fa-f]{4})\s+ret=(\d+)/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    const hexStr = match[1];
    const retStr = match[2];
    const cmdId = parseInt(hexStr, 16);
    const retCode = parseInt(retStr, 10);
    
    const moduleId = (cmdId >> 8) & 0xFF;
    const index = cmdId & 0xFF;
    const cmdInfo = CMD_ID_TO_INFO.get(cmdId);
    
    const shortModule = cmdInfo ? cmdInfo.module.replace('BT_RPC_', '') : (MODULE_ID_TO_NAME[moduleId] || `MOD${moduleId}`);
    
    if (cmdInfo) {
      return {
        badge: 'rpc',
        rawValue: `0x${cmdId.toString(16).toUpperCase().padStart(4, '0')}`,
        name: cmdInfo.name,
        desc: `${shortModule}[${index}] ret=${retCode}${retCode !== 0 ? `(${getWqRetName(retCode)})` : ''}`,
        severity: retCode !== 0 ? 'error' : 'info',
      };
    } else {
      return {
        badge: 'rpc',
        rawValue: `0x${cmdId.toString(16).toUpperCase().padStart(4, '0')}`,
        name: `UNKNOWN_CMD`,
        desc: `${shortModule}[${index}] ret=${retCode} 未定义命令`,
        severity: 'warning',
      };
    }
  }
};