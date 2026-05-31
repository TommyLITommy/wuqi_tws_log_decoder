import type { LogParser, ParseResult } from '@/types';
import { extractBattery, BATTERY_RE } from '@/share/batteryLog';

export const batteryParser: LogParser = {
  name: 'BatteryParser',
  pattern: BATTERY_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const battery = extractBattery(line);
    if (!battery) return null;

    return {
      badge: 'status',
      rawValue: `${battery.lvl}%`,
      name: 'BATTERY',
      desc: `volt:${battery.volt} lvl:${battery.lvl} last_level:${battery.lastLevel} charging:${battery.charging ? 1 : 0} MV:${battery.mv}`,
      severity: battery.lvl <= 20 ? 'warning' : battery.charging ? 'success' : 'info',
    };
  },
};
