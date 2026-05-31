import type { DeviceStatusSnapshot, WwsRssiInfo } from '@/types';

/** 匹配 [app_wws] crc_err:0 seq_err:255 phone_rssi:-56 wws_rssi:-127 */
export const WWS_RSSI_RE =
  /\[app_wws\]\s+crc_err:(\d+)\s+seq_err:(\d+)\s+phone_rssi:(-?\d+)\s+wws_rssi:(-?\d+)/i;

export function extractWwsRssi(raw: string): WwsRssiInfo | null {
  const match = WWS_RSSI_RE.exec(raw);
  if (!match) return null;

  const crcErr = parseInt(match[1], 10);
  const seqErr = parseInt(match[2], 10);
  const phoneRssi = parseInt(match[3], 10);
  const wwsRssi = parseInt(match[4], 10);

  if ([crcErr, seqErr, phoneRssi, wwsRssi].some(v => Number.isNaN(v))) return null;

  return { crcErr, seqErr, phoneRssi, wwsRssi };
}

export function wwsRssiEqual(a: WwsRssiInfo | null, b: WwsRssiInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.crcErr === b.crcErr
    && a.seqErr === b.seqErr
    && a.phoneRssi === b.phoneRssi
    && a.wwsRssi === b.wwsRssi;
}

export function applyWwsRssiLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const rssi = extractWwsRssi(raw);
  if (!rssi) return;

  snapshot.wwsRssi = rssi;
  snapshot.lastEvent = `phone_rssi=${rssi.phoneRssi} wws_rssi=${rssi.wwsRssi}`;
}

export function isRssiValid(rssi: number): boolean {
  return rssi > -127 && rssi <= 0;
}

export function formatRssiDbm(rssi: number): string {
  if (!isRssiValid(rssi)) return '无效';
  return `${rssi} dBm`;
}

export function toneForRssiDbm(rssi: number): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (!isRssiValid(rssi)) return 'default';
  if (rssi >= -60) return 'success';
  if (rssi >= -75) return 'info';
  if (rssi >= -90) return 'warning';
  return 'danger';
}

export function formatWwsRssiTitle(info: WwsRssiInfo | null): string | undefined {
  if (!info) return undefined;
  return `crc_err:${info.crcErr} seq_err:${info.seqErr} phone_rssi:${info.phoneRssi} wws_rssi:${info.wwsRssi}`;
}
