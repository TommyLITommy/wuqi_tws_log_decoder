import type { TwsRoleState } from '@/types';

/** 匹配 [app_wws] app_wws_handle_role_changed from 2 to 1, reason:7 */
export const WWS_ROLE_CHANGED_RE =
  /\[app_wws\]\s+app_wws_handle_role_changed\s+from\s+(\d+)\s+to\s+(\d+)\s*,\s*reason:(\d+)/i;

export const TWS_ROLE_MAP: Record<number, string> = {
  0: 'TWS_ROLE_UNKNOWN',
  1: 'TWS_ROLE_MASTER',
  2: 'TWS_ROLE_SLAVE',
};

export const TWS_ROLE_CHANGED_REASON_MAP: Record<number, string> = {
  0: 'TWS_ROLE_CHANGED_REASON_USER',
  1: 'TWS_ROLE_CHANGED_REASON_CONNECT_FAIL',
  2: 'TWS_ROLE_CHANGED_REASON_RSSI',
  3: 'TWS_ROLE_CHANGED_REASON_LINK_LOSS',
  4: 'TWS_ROLE_CHANGED_REASON_PEER_POWER_OFF',
  5: 'TWS_ROLE_CHANGED_REASON_PEER_NOT_FOUND',
  6: 'TWS_ROLE_CHANGED_REASON_RESET',
  7: 'TWS_ROLE_CHANGED_REASON_POWER_ON',
};

export function getTwsRoleName(role: number): string {
  return TWS_ROLE_MAP[role] ?? `UNKNOWN(${role})`;
}

export function getTwsRoleChangedReasonName(reason: number): string {
  return TWS_ROLE_CHANGED_REASON_MAP[reason] ?? `UNKNOWN(${reason})`;
}

export function mapTwsRoleEnum(role: number): TwsRoleState {
  if (role === 1) return 'master';
  if (role === 2) return 'slave';
  return 'unknown';
}

export interface WwsRoleChangedInfo {
  fromRole: number;
  toRole: number;
  reason: number;
  fromRoleName: string;
  toRoleName: string;
  reasonName: string;
}

export function extractWwsRoleChanged(raw: string): WwsRoleChangedInfo | null {
  const match = WWS_ROLE_CHANGED_RE.exec(raw);
  if (!match) return null;

  const fromRole = parseInt(match[1], 10);
  const toRole = parseInt(match[2], 10);
  const reason = parseInt(match[3], 10);

  if ([fromRole, toRole, reason].some(v => Number.isNaN(v) || v < 0)) return null;

  return {
    fromRole,
    toRole,
    reason,
    fromRoleName: getTwsRoleName(fromRole),
    toRoleName: getTwsRoleName(toRole),
    reasonName: getTwsRoleChangedReasonName(reason),
  };
}
