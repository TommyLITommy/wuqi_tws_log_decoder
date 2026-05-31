import type { DeviceStatusSnapshot } from '@/types';

/** 匹配 Link_Key: E4 81 5B 39 E1 BF 98 D1 B0 3F 85 11 AD 9F 96 31 */
export const LINK_KEY_RE =
  /Link_Key:\s*((?:[0-9A-Fa-f]{2}\s*){16})/i;

export function extractLinkKey(raw: string): string | null {
  const match = LINK_KEY_RE.exec(raw);
  if (!match) return null;

  const bytes = match[1].trim().split(/\s+/);
  if (bytes.length !== 16) return null;
  if (bytes.some(b => !/^[0-9A-Fa-f]{2}$/.test(b))) return null;

  return bytes.map(b => b.toUpperCase()).join(' ');
}

export function formatLinkKey(value: string | null): string {
  return value ?? '未知';
}

export function applyLinkKeyLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const linkKey = extractLinkKey(raw);
  if (!linkKey) return;

  snapshot.linkKey = linkKey;
  snapshot.lastEvent = `Link_Key: ${linkKey}`;
}
