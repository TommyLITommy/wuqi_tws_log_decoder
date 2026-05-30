import type { DecodeTableEntry } from '@/types';

export const DECODE_TABLE: Record<string, DecodeTableEntry> = {
  '0x1503': { name: 'HCI_IAP2_Send', desc: 'IAP2命令发送完成', badge: 'iap2' },
  '0x1504': { name: 'HCI_IAP2_Recv', desc: 'IAP2数据接收', badge: 'iap2' },
  '0x1505': { name: 'HCI_IAP2_Connect', desc: 'IAP2连接建立', badge: 'iap2' },
  '0x1506': { name: 'HCI_IAP2_Disconnect', desc: 'IAP2连接断开', badge: 'iap2' },
  '0x0802': { name: 'HCI_Some_Cmd', desc: '示例命令', badge: 'hci' },
  '0x0405': { name: 'HCI_Create_Connection', desc: '创建蓝牙连接', badge: 'hci' },
  '0x0406': { name: 'HCI_Disconnect', desc: '断开连接', badge: 'hci' },
  '0x0C03': { name: 'HCI_Reset', desc: '复位控制器', badge: 'hci' },
  '0x0C01': { name: 'HCI_Set_Event_Mask', desc: '设置事件掩码', badge: 'hci' },
};

export const PATTERNS = [
  /bt\s+handle\s+cmd[:=]\s*(0x[0-9a-fA-F]+|\d+)/i,
  /handle\s+cmd[:=]\s*(0x[0-9a-fA-F]+|\d+)/i,
  /hci\s+cmd[:=]\s*(0x[0-9a-fA-F]+|\d+)/i,
  /wq_send_rpc_cmd\s+(0x[0-9a-fA-F]+|\d+)/i,
  /(?:^|[^0-9a-zA-Z])(0x[0-9a-fA-F]{1,4})(?![0-9a-fA-Z])/i,
  /(?:^|[^0-9a-zA-Z:])([0-9a-fA-F]{4})(?![0-9a-fA-Z:])/i,
  /(?:^|\s)([0-9]{3,5})(?:\s|$|,)/,
];

export const ITEM_HEIGHT = 24;
export const DEFAULT_SIZES = { leftWidth: 50, thumbWidth: 80 };