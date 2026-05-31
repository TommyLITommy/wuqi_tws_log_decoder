import type { ConnectedDeviceInfo, DeviceStatusSnapshot } from '@/types';

const BT_ADDR_COLON_RE = /\b([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\b/;
const BT_ADDR_PLAIN_RE = /\b([0-9A-Fa-f]{12})\b/;

const INDEXED_ADDR_PATTERNS = [
  /\[CM:(\d+)[^\]]*\][^\n]{0,240}?(?:addr(?:ess)?|bd_addr?|bdaddr|mac)[\s:=]+([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}|[0-9A-Fa-f]{12})/i,
  /(?:^|[^\d])(?:index|cm|CM)[\s:=]+(\d+)[^\n]{0,160}?(?:addr(?:ess)?|bd_addr?|bdaddr|mac)[\s:=]+([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}|[0-9A-Fa-f]{12})/i,
];

const CONNECT_ADDR_PATTERNS = [
  /(?:connect(?:ed|ion)?|CM_connected|LINK_CONNECTED|ACL_CONNECTED)[^\n]{0,200}?(?:addr(?:ess)?|bd_addr?|bdaddr|mac)[\s:=]+([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}|[0-9A-Fa-f]{12})/i,
];

/** set_phone_name new= SB */
const SET_PHONE_NAME_INDEXED_RE =
  /set_phone_name\b[^\n]*?(?:\[CM:(\d+)|(?:\b(?:index|cm)\s*[=:]\s*(\d+)))[^\n]*?\bnew\s*=\s*(.+?)(?:\s*$|\s*\[|\s*,)/i;
const SET_PHONE_NAME_NEW_RE =
  /set_phone_name\b[^\n]*?\bnew\s*=\s*(.+?)(?:\s*$|\s*\[|\s*,)/i;

/** set_phone_addr new= 38:E1:3D:5C:E3:18 */
const SET_PHONE_ADDR_INDEXED_RE =
  /set_phone_(?:addr|address|mac)\b[^\n]*?(?:\[CM:(\d+)|(?:\b(?:index|cm)\s*[=:]\s*(\d+)))[^\n]*?\bnew\s*=\s*([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}|[0-9A-Fa-f]{12})/i;
const SET_PHONE_ADDR_NEW_RE =
  /set_phone_(?:addr|address|mac)\b[^\n]*?\bnew\s*=\s*([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}|[0-9A-Fa-f]{12})/i;

export function normalizeBtAddress(raw: string): string | null {
  const trimmed = raw.trim();
  const colonMatch = trimmed.match(BT_ADDR_COLON_RE);
  if (colonMatch) {
    return colonMatch[1].toUpperCase();
  }

  const plainMatch = trimmed.match(BT_ADDR_PLAIN_RE);
  if (plainMatch) {
    const hex = plainMatch[1].toUpperCase();
    return hex.match(/.{2}/g)?.join(':') ?? null;
  }

  return null;
}

function sanitizeDeviceName(name: string): string | null {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  if (/^(null|none|unknown|n\/a|new=?)$/i.test(cleaned)) return null;
  return cleaned;
}

function parseSetPhoneName(raw: string): { index?: number; name: string } | null {
  const indexedMatch = SET_PHONE_NAME_INDEXED_RE.exec(raw);
  if (indexedMatch) {
    const indexToken = indexedMatch[1] ?? indexedMatch[2];
    const name = indexedMatch[3]?.trim();
    if (!name) return null;
    return {
      index: indexToken !== undefined ? parseInt(indexToken, 10) : undefined,
      name,
    };
  }

  const match = SET_PHONE_NAME_NEW_RE.exec(raw);
  if (!match) return null;

  const name = match[1]?.trim();
  if (!name) return null;
  return { name };
}

function parseSetPhoneAddr(raw: string): { index?: number; address: string } | null {
  const indexedMatch = SET_PHONE_ADDR_INDEXED_RE.exec(raw);
  if (indexedMatch) {
    const indexToken = indexedMatch[1] ?? indexedMatch[2];
    const address = indexedMatch[3];
    if (!address) return null;
    return {
      index: indexToken !== undefined ? parseInt(indexToken, 10) : undefined,
      address,
    };
  }

  const match = SET_PHONE_ADDR_NEW_RE.exec(raw);
  if (!match) return null;

  return { address: match[1] };
}

function inferDeviceIndex(snapshot: DeviceStatusSnapshot, explicitIndex?: number): number {
  if (explicitIndex !== undefined && !Number.isNaN(explicitIndex)) return explicitIndex;
  if (snapshot.primaryPhoneIndex !== null) return snapshot.primaryPhoneIndex;
  if (snapshot.connectedPhoneIndices.length > 0) {
    return snapshot.connectedPhoneIndices[snapshot.connectedPhoneIndices.length - 1];
  }
  return 0;
}

function getOrCreateDevice(snapshot: DeviceStatusSnapshot, index: number): ConnectedDeviceInfo {
  if (!snapshot.connectedDevices[index]) {
    snapshot.connectedDevices[index] = { name: null, address: null };
  }
  return snapshot.connectedDevices[index];
}

function setDeviceName(snapshot: DeviceStatusSnapshot, index: number, name: string) {
  const sanitized = sanitizeDeviceName(name);
  if (!sanitized) return;
  getOrCreateDevice(snapshot, index).name = sanitized;
}

function setDeviceAddress(snapshot: DeviceStatusSnapshot, index: number, address: string) {
  const normalized = normalizeBtAddress(address);
  if (!normalized) return;
  getOrCreateDevice(snapshot, index).address = normalized;
}

export function applyDeviceInfoLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const setPhoneName = parseSetPhoneName(raw);
  if (setPhoneName) {
    const index = inferDeviceIndex(snapshot, setPhoneName.index);
    setDeviceName(snapshot, index, setPhoneName.name);
    snapshot.lastEvent = `set_phone_name new=${setPhoneName.name}`;
  }

  const setPhoneAddr = parseSetPhoneAddr(raw);
  if (setPhoneAddr) {
    const index = inferDeviceIndex(snapshot, setPhoneAddr.index);
    setDeviceAddress(snapshot, index, setPhoneAddr.address);
    snapshot.lastEvent = `set_phone_addr new=${normalizeBtAddress(setPhoneAddr.address)}`;
  }

  for (const pattern of INDEXED_ADDR_PATTERNS) {
    const match = pattern.exec(raw);
    if (match) {
      setDeviceAddress(snapshot, parseInt(match[1], 10), match[2]);
      snapshot.lastEvent = `CM${match[1]} addr=${normalizeBtAddress(match[2])}`;
    }
  }

  for (const pattern of CONNECT_ADDR_PATTERNS) {
    const match = pattern.exec(raw);
    if (match) {
      const index = inferDeviceIndex(snapshot);
      setDeviceAddress(snapshot, index, match[1]);
      snapshot.lastEvent = `device addr=${normalizeBtAddress(match[1])}`;
    }
  }
}

export function clearDeviceInfo(snapshot: DeviceStatusSnapshot, index: number) {
  delete snapshot.connectedDevices[index];
}

export function clearAllDeviceInfo(snapshot: DeviceStatusSnapshot) {
  snapshot.connectedDevices = {};
}

function deviceFieldChanged(
  before: Record<number, ConnectedDeviceInfo>,
  after: Record<number, ConnectedDeviceInfo>,
  field: keyof ConnectedDeviceInfo
): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const idx = Number(key);
    if (before[idx]?.[field] !== after[idx]?.[field]) return true;
  }
  return false;
}

export function deviceNamesChanged(
  before: Record<number, ConnectedDeviceInfo>,
  after: Record<number, ConnectedDeviceInfo>
): boolean {
  return deviceFieldChanged(before, after, 'name');
}

export function deviceAddressesChanged(
  before: Record<number, ConnectedDeviceInfo>,
  after: Record<number, ConnectedDeviceInfo>
): boolean {
  return deviceFieldChanged(before, after, 'address');
}

export function devicesSnapshotEqual(
  a: Record<number, ConnectedDeviceInfo>,
  b: Record<number, ConnectedDeviceInfo>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => {
    const idx = Number(key);
    return a[idx]?.name === b[idx]?.name && a[idx]?.address === b[idx]?.address;
  });
}

export function formatPhoneName(info: ConnectedDeviceInfo | undefined): string {
  return info?.name ?? '未知';
}

export function formatPhoneAddress(info: ConnectedDeviceInfo | undefined): string {
  return info?.address ?? '未知';
}

export function getDisplayDeviceIndices(snapshot: DeviceStatusSnapshot): number[] {
  if (snapshot.linkState !== 'connected' && snapshot.connectedPhoneIndices.length === 0) {
    return [];
  }

  const indices = new Set(snapshot.connectedPhoneIndices);
  if (snapshot.primaryPhoneIndex !== null) indices.add(snapshot.primaryPhoneIndex);

  Object.keys(snapshot.connectedDevices).forEach(key => {
    const idx = Number(key);
    const info = snapshot.connectedDevices[idx];
    if (info?.name || info?.address) indices.add(idx);
  });

  if (indices.size === 0 && snapshot.linkState === 'connected') {
    indices.add(snapshot.primaryPhoneIndex ?? 0);
  }

  return [...indices].sort((a, b) => a - b);
}

function deviceLabelSuffix(displayDevices: number[], index: number): string {
  return displayDevices.length > 1 ? String(index) : '';
}

export function phoneNameLabel(displayDevices: number[], index: number): string {
  const suffix = deviceLabelSuffix(displayDevices, index);
  return suffix ? `手机名${suffix}` : '手机名';
}

export function phoneAddressLabel(displayDevices: number[], index: number): string {
  const suffix = deviceLabelSuffix(displayDevices, index);
  return suffix ? `手机地址${suffix}` : '手机地址';
}
