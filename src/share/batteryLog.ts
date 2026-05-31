import type { BatteryInfo, DeviceStatusSnapshot } from '@/types';

export const BATTERY_RE =
  /volt:(\d+)\s+lvl:(\d+)\s+last_level\s*=\s*(\d+)\s*,\s*charging:(\d+)\s*,\s*MV:(\d+)/i;

export function extractBattery(raw: string): BatteryInfo | null {
  const match = BATTERY_RE.exec(raw);
  if (!match) return null;

  const volt = parseInt(match[1], 10);
  const lvl = parseInt(match[2], 10);
  const lastLevel = parseInt(match[3], 10);
  const charging = parseInt(match[4], 10);
  const mv = parseInt(match[5], 10);

  if ([volt, lvl, lastLevel, charging, mv].some(v => Number.isNaN(v) || v < 0)) return null;
  if (lvl > 100 || lastLevel > 100) return null;

  return {
    volt,
    lvl,
    lastLevel,
    charging: charging !== 0,
    mv,
  };
}

export function batteryEqual(a: BatteryInfo | null, b: BatteryInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.volt === b.volt
    && a.lvl === b.lvl
    && a.lastLevel === b.lastLevel
    && a.charging === b.charging
    && a.mv === b.mv;
}

export function applyBatteryLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const battery = extractBattery(raw);
  if (!battery) return;

  snapshot.battery = battery;
  snapshot.charging = battery.charging;
  snapshot.lastEvent = `battery lvl=${battery.lvl}% volt=${battery.volt}mV charging=${battery.charging ? 1 : 0}`;
}
