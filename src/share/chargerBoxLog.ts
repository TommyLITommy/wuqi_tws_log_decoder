/** 匹配 [box] charger_box_init boot_reason:4 src:3 flag:6 ret:0 */
export const CHARGER_BOX_INIT_RE =
  /\[box\]\s+charger_box_init\s+boot_reason:(\d+)\s+src:(\d+)\s+flag:(\d+)\s+ret:(\d+)/i;

/** BOOT_REASON_TYPE */
export const BOOT_REASON_MAP: Record<number, string> = {
  0: 'BOOT_REASON_UNKNOWN',
  1: 'BOOT_REASON_POR',
  2: 'BOOT_REASON_SLEEP',
  3: 'BOOT_REASON_WDT',
  4: 'BOOT_REASON_SOFT',
  5: 'BOOT_REASON_CPU',
  6: 'BOOT_REASON_DEBOUNCE',
};

export function getBootReasonName(reason: number): string {
  return BOOT_REASON_MAP[reason] ?? `UNKNOWN(${reason})`;
}

export interface ChargerBoxInitInfo {
  bootReason: number;
  bootReasonName: string;
  src: number;
  flag: number;
  ret: number;
}

export function extractChargerBoxInit(raw: string): ChargerBoxInitInfo | null {
  const match = CHARGER_BOX_INIT_RE.exec(raw);
  if (!match) return null;

  const bootReason = parseInt(match[1], 10);
  const src = parseInt(match[2], 10);
  const flag = parseInt(match[3], 10);
  const ret = parseInt(match[4], 10);

  if ([bootReason, src, flag, ret].some(v => Number.isNaN(v) || v < 0)) return null;

  return {
    bootReason,
    bootReasonName: getBootReasonName(bootReason),
    src,
    flag,
    ret,
  };
}
