import type { DeviceStatusSnapshot, TwsRoleState } from '@/types';
import { mapTwsRoleEnum, extractWwsRoleChanged } from '@/share/wwsRoleChangedLog';

const IS_MASTER_RE = /\bis_master\s*=\s*([01])\b/i;

export function parseIsMaster(raw: string): TwsRoleState | null {
  const match = IS_MASTER_RE.exec(raw);
  if (!match) return null;
  return match[1] === '1' ? 'master' : 'slave';
}

export function applyMasterRoleLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const role = parseIsMaster(raw);
  if (role === null) return;

  snapshot.twsRole = role;
  snapshot.lastEvent = role === 'master' ? 'is_master = 1' : 'is_master = 0';
}

export function applyWwsRoleChangedLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const info = extractWwsRoleChanged(raw);
  if (!info) return;

  snapshot.twsRole = mapTwsRoleEnum(info.toRole);
  snapshot.lastEvent = `role ${info.fromRoleName} => ${info.toRoleName} (${info.reasonName})`;
}
