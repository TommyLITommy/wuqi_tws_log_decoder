/** 匹配 a2dp_appl_notify_cb Event:9, Instance = 0, Result = 0x0000, Data = f004c014, Data Length = 12 */
export const A2DP_APPL_EVENT_RE =
  /a2dp_appl_notify_cb\s+Event:(\d+|0x[0-9a-fA-F]+)\s*,\s*Instance\s*=\s*(\d+)\s*,\s*Result\s*=\s*(0x[0-9a-fA-F]+)\s*,\s*Data\s*=\s*([0-9a-fA-F]+)\s*,\s*Data Length\s*=\s*(\d+)/i;

export const A2DP_APPL_EVENT_MAP: Record<number, string> = {
  0x01: 'A2DP_CONNECT_CNF',
  0x02: 'A2DP_DISCONNECT_CNF',
  0x03: 'A2DP_START_CNF',
  0x04: 'A2DP_SUSPEND_CNF',
  0x05: 'A2DP_RECONFIGURE_CNF',
  0x06: 'A2DP_CONNECT_IND',
  0x07: 'A2DP_DISCONNECT_IND',
  0x08: 'A2DP_START_IND',
  0x09: 'A2DP_CONFIGURE_IND',
  0x0A: 'A2DP_SUSPEND_IND',
  0x0B: 'A2DP_MEDIA_FRAME_IND',
  0x0C: 'A2DP_DELAY_REPORT_IND',
  0x0D: 'A2DP_DELAY_REPORT_CNF',
};

export function parseA2dpApplEventValue(raw: string): number {
  if (/^0x/i.test(raw)) return parseInt(raw, 16);
  return parseInt(raw, 10);
}

export function getA2dpApplEventName(event: number): string {
  return A2DP_APPL_EVENT_MAP[event] ?? `UNKNOWN(0x${event.toString(16).toUpperCase()})`;
}

export interface A2dpApplEventInfo {
  event: number;
  instance: number;
  result: number;
  data: string;
  dataLength: number;
  eventName: string;
}

export function extractA2dpApplEvent(raw: string): A2dpApplEventInfo | null {
  const match = A2DP_APPL_EVENT_RE.exec(raw);
  if (!match) return null;

  const event = parseA2dpApplEventValue(match[1]);
  const instance = parseInt(match[2], 10);
  const result = parseInt(match[3], 16);
  const data = match[4];
  const dataLength = parseInt(match[5], 10);

  if ([event, instance, result, dataLength].some(v => Number.isNaN(v))) return null;

  return {
    event,
    instance,
    result,
    data,
    dataLength,
    eventName: getA2dpApplEventName(event),
  };
}
