/** TDS_PROFILE_FLAG */
export const TDS_PROFILE_FLAG = {
  HF: 1 << 0,
  A2DP: 1 << 1,
  AVRCP: 1 << 2,
  SPP: 1 << 3,
  L2CAP: 1 << 4,
  GATT: 1 << 5,
  HID: 1 << 6,
  PAN: 1 << 7,
} as const;

export const TDS_PROFILE_FLAG_NAMES: Record<number, string> = {
  [TDS_PROFILE_FLAG.HF]: 'HF_FLAG',
  [TDS_PROFILE_FLAG.A2DP]: 'A2DP_FLAG',
  [TDS_PROFILE_FLAG.AVRCP]: 'AVRCP_FLAG',
  [TDS_PROFILE_FLAG.SPP]: 'SPP_FLAG',
  [TDS_PROFILE_FLAG.L2CAP]: 'L2CAP_FLAG',
  [TDS_PROFILE_FLAG.GATT]: 'GATT_FLAG',
  [TDS_PROFILE_FLAG.HID]: 'HID_FLAG',
  [TDS_PROFILE_FLAG.PAN]: 'PAN_FLAG',
};

/**
 * DBGLOG_BT_APP_VERBOSE(
 *   "[CM:%d, 0x%04X]CM_connected PROFILE_CONNECT_IND_SIG %02x %02x\n",
 *   index, me->acl_handle, pe->profile_flag, me->profile_flag);
 * 末尾两个 %02x 分别为 pe->profile_flag、me->profile_flag
 */
export const PROFILE_CONNECT_IND_SIG_RE =
  /PROFILE_CONNECT_IND_SIG\s+(?:0x)?([0-9A-Fa-f]{1,2})\s+(?:0x)?([0-9A-Fa-f]{1,2})\b/i;

/** 可选解析 CM 连接上下文：[CM:0, 0x0042]CM_connected */
export const PROFILE_CONNECT_CM_RE =
  /\[CM:(\d+),\s*(0x[0-9A-Fa-f]{4})\]CM_connected/i;

export function parseProfileConnectFlags(match: RegExpMatchArray): {
  peProfileFlag: number;
  meProfileFlag: number;
} {
  return {
    peProfileFlag: parseInt(match[1], 16),
    meProfileFlag: parseInt(match[2], 16),
  };
}

export function decodeTdsProfileFlags(mask: number): string[] {
  if (mask === 0) return ['none'];

  const flags: string[] = [];
  for (const bit of Object.keys(TDS_PROFILE_FLAG_NAMES).map(Number).sort((a, b) => a - b)) {
    if (mask & bit) flags.push(TDS_PROFILE_FLAG_NAMES[bit]);
  }
  return flags.length ? flags : [`UNKNOWN(0x${mask.toString(16).toUpperCase()})`];
}

export function formatTdsProfileFlags(mask: number): string {
  return decodeTdsProfileFlags(mask).join(' | ');
}
