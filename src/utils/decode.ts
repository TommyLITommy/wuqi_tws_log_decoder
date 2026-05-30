import { DECODE_TABLE, PATTERNS } from './constants';
import type { DecodedResult } from '@/types';

export function decodeLine(line: string): DecodedResult | null {
  for (const pattern of PATTERNS) {
    const match = line.match(pattern);
    if (!match) continue;

    const rawValue = match[1].trim();
    let value: number;

    if (rawValue.toLowerCase().startsWith('0x')) {
      value = parseInt(rawValue, 16);
    } else if (/^[0-9a-fA-F]+$/.test(rawValue) && rawValue.length <= 4) {
      value = parseInt(rawValue, 16);
    } else {
      value = parseInt(rawValue, 10);
    }

    if (isNaN(value)) continue;

    const hexKey = '0x' + value.toString(16).toUpperCase().padStart(4, '0');
    const decoded = DECODE_TABLE[hexKey];
    if (decoded) {
      return {
        badge: decoded.badge || 'hci',
        rawValue,
        hexValue: hexKey,
        name: decoded.name,
        desc: decoded.desc,
        matchText: rawValue,
      };
    }
  }
  return null;
}