/** 匹配 appl_avrcp_ntf_cb Event:7, Result:0x0000, Instance = 1, BD_ADDR:38E13D5CE318 */
export const AVRCP_APPL_EVENT_RE =
  /appl_avrcp_ntf_cb\s+Event:(\d+|0x[0-9a-fA-F]+)\s*,\s*Result:(0x[0-9a-fA-F]+)\s*,\s*Instance\s*=\s*(\d+)\s*,\s*BD_ADDR:([0-9A-Fa-f]+)/i;

export const AVRCP_APPL_EVENT_MAP: Record<number, string> = {
  0x01: 'AVRCP_CONNECT_IND',
  0x02: 'AVRCP_CONNECT_CNF',
  0x03: 'AVRCP_DISCONNECT_IND',
  0x04: 'AVRCP_DISCONNECT_CNF',
  0x05: 'AVRCP_MESSAGE_IND',
  0x06: 'AVRCP_MESSAGE_CNF',
  0x07: 'AVRCP_MESSAGE_SEND_CNF',
  0x10: 'AVRCP_METADATA_CMD',
  0x11: 'AVRCP_METADATA_RSP',
  0x12: 'AVRCP_METADATA_INTERIM_RSP',
  0x20: 'AVRCP_BOW_CONNECT_IND',
  0x21: 'AVRCP_BOW_CONNECT_CNF',
  0x22: 'AVRCP_BOW_DISCONNECT_IND',
  0x23: 'AVRCP_BOW_DISCONNECT_CNF',
  0x24: 'AVRCP_BOW_MESSAGE_IND',
  0x25: 'AVRCP_BOW_MESSAGE_RSP',
};

export function parseAvrcpApplEventValue(raw: string): number {
  if (/^0x/i.test(raw)) return parseInt(raw, 16);
  return parseInt(raw, 10);
}

export function getAvrcpApplEventName(event: number): string {
  return AVRCP_APPL_EVENT_MAP[event] ?? `UNKNOWN(0x${event.toString(16).toUpperCase()})`;
}

export function formatBdAddr(raw: string): string {
  const hex = raw.replace(/[^0-9A-Fa-f]/g, '');
  const pairs = hex.match(/.{1,2}/g);
  return pairs?.join(':').toUpperCase() ?? raw.toUpperCase();
}

export interface AvrcpApplEventInfo {
  event: number;
  result: number;
  instance: number;
  bdAddr: string;
  eventName: string;
}

export function extractAvrcpApplEvent(raw: string): AvrcpApplEventInfo | null {
  const match = AVRCP_APPL_EVENT_RE.exec(raw);
  if (!match) return null;

  const event = parseAvrcpApplEventValue(match[1]);
  const result = parseInt(match[2], 16);
  const instance = parseInt(match[3], 10);
  const bdAddr = match[4];

  if ([event, result, instance].some(v => Number.isNaN(v))) return null;

  return {
    event,
    result,
    instance,
    bdAddr,
    eventName: getAvrcpApplEventName(event),
  };
}
