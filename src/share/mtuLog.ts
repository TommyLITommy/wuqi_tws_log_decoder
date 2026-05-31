import type { DeviceStatusSnapshot } from '@/types';

/** 匹配 [wq_gatt] gatt mtu changed to 672 */
export const MTU_CHANGED_RE = /gatt\s+mtu\s+changed\s+to\s+(\d+)/i;

export function extractMtu(raw: string): number | null {
  const match = MTU_CHANGED_RE.exec(raw);
  if (!match) return null;

  const mtu = parseInt(match[1], 10);
  if (Number.isNaN(mtu) || mtu <= 0) return null;

  return mtu;
}

export function formatMtu(value: number | null): string {
  if (value === null) return '未知';
  return String(value);
}

export function applyMtuLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const mtu = extractMtu(raw);
  if (mtu === null) return;

  snapshot.mtu = mtu;
  snapshot.lastEvent = `gatt mtu changed to ${mtu}`;
}
