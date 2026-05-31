/** 匹配 hfp_appl_event_cb Event:56, Instance:0x01, result:0x0000 */
export const HFP_APPL_EVENT_RE =
  /hfp_appl_event_cb\s+Event:(\d+|0x[0-9a-fA-F]+)\s*,\s*Instance:(0x[0-9a-fA-F]+)\s*,\s*result:(0x[0-9a-fA-F]+)/i;

export const HFP_APPL_EVENT_MAP: Record<number, string> = {
  0x01: 'WQ_HFP_UNIT_CONNECT_CNF',
  0x02: 'WQ_HFP_UNIT_CONNECT_IND',
  0x03: 'WQ_HFP_UNIT_DISCONNECT_CNF',
  0x04: 'WQ_HFP_UNIT_DISCONNECT_IND',
  0x05: 'WQ_HFP_UNIT_STOP_CNF',
  0x11: 'WQ_HFP_UNIT_INCALL_ALERT',
  0x12: 'WQ_HFP_UNIT_CLI_DIGITS',
  0x13: 'WQ_HFP_UNIT_CALL_WAITING_IND',
  0x14: 'WQ_HFP_UNIT_CALLSETUP',
  0x15: 'WQ_HFP_UNIT_NO_CALL',
  0x16: 'WQ_HFP_UNIT_CALL_ACTIVE',
  0x17: 'WQ_HFP_UNIT_SEND_DTMF_CNF',
  0x18: 'WQ_HFP_UNIT_TWC_CALL_CTRL_CNF',
  0x19: 'WQ_HFP_UNIT_CALLHANGUP_CNF',
  0x1A: 'WQ_HFP_UNIT_OUTCALL_CNF',
  0x1B: 'WQ_HFP_UNIT_INCALL_ACCEPT_CNF',
  0x1C: 'WQ_HFP_UNIT_CHLD_MPRTY_CAP',
  0x21: 'WQ_HFP_UNIT_AG_ERROR_IND',
  0x22: 'WQ_HFP_UNIT_BSIR_IND',
  0x23: 'WQ_HFP_UNIT_VGM_IND',
  0x24: 'WQ_HFP_UNIT_VGS_IND',
  0x25: 'WQ_HFP_UNIT_VOICE_RECOG_IND',
  0x26: 'WQ_HFP_UNIT_VOICETAG_PHNUM_IND',
  0x27: 'WQ_HFP_UNIT_AG_SERVICE_IND',
  0x28: 'WQ_HFP_UNIT_CIEV_SIGNAL_IND',
  0x29: 'WQ_HFP_UNIT_CIEV_ROAM_IND',
  0x2A: 'WQ_HFP_UNIT_CIEV_BATTCHG_IND',
  0x2B: 'WQ_HFP_UNIT_PEER_IND_STATUS_CNF',
  0x2C: 'WQ_HFP_UNIT_PEER_IND_STATUS_IND',
  0x2D: 'WQ_HFP_UNIT_OK_IND',
  0x31: 'WQ_HFP_UNIT_VREC_ENABLE_CNF',
  0x32: 'WQ_HFP_UNIT_VREC_DISABLE_CNF',
  0x33: 'WQ_HFP_UNIT_ECNR_CNF',
  0x34: 'WQ_HFP_UNIT_CLIP_CNF',
  0x35: 'WQ_HFP_UNIT_CCWA_CNF',
  0x36: 'WQ_HFP_UNIT_VOICETAG_PHNUM_CNF',
  0x37: 'WQ_HFP_UNIT_SET_VGM_CNF',
  0x38: 'WQ_HFP_UNIT_SET_VGS_CNF',
  0x41: 'WQ_HFP_UNIT_RECVD_BTRH_IND',
  0x42: 'WQ_HFP_UNIT_REQ_SUB_NUM_IND',
  0x43: 'WQ_HFP_UNIT_COPS_QUERY_RESULT_IND',
  0x44: 'WQ_HFP_UNIT_CURRENT_CALL_LIST_IND',
  0x45: 'WQ_HFP_UNIT_CALL_HELD_IND',
  0x46: 'WQ_HFP_UNIT_CMEE_IND',
  0x47: 'WQ_HFP_UNIT_CMEE_CNF',
  0x48: 'WQ_HFP_UNIT_REQ_SUB_NUM_CNF',
  0x49: 'WQ_HFP_UNIT_SET_NW_NAME_FORMAT_CNF',
  0x4A: 'WQ_HFP_UNIT_ADV_CALL_HOLD_CNF',
  0x4B: 'WQ_HFP_UNIT_COPS_QUERY_CNF',
  0x4C: 'WQ_HFP_UNIT_CURRENT_CALL_LIST_CNF',
  0x4D: 'WQ_HFP_UNIT_SEND_BTRH_CNF',
  0x4E: 'WQ_HFP_UNIT_BIA_CNF',
  0x4F: 'WQ_HFP_UNIT_BAC_CNF',
  0x50: 'WQ_HFP_UNIT_BCC_CNF',
  0x51: 'WQ_HFP_UNIT_BCS_CNF',
  0x52: 'WQ_HFP_UNIT_BCS_IND',
  0x53: 'WQ_HFP_UNIT_BIEV_CNF',
  0x54: 'WQ_HFP_UNIT_BIND_IND',
  0xE0: 'WQ_HFP_UNIT_SEND_DATA_CNF',
  0xE1: 'WQ_HFP_UNIT_RECVD_DATA_IND',
};

export function parseHfpApplEventValue(raw: string): number {
  if (/^0x/i.test(raw)) return parseInt(raw, 16);
  return parseInt(raw, 10);
}

export function getHfpApplEventName(event: number): string {
  return HFP_APPL_EVENT_MAP[event] ?? `UNKNOWN(0x${event.toString(16).toUpperCase()})`;
}

export interface HfpApplEventInfo {
  event: number;
  instance: string;
  result: number;
  eventName: string;
}

export function extractHfpApplEvent(raw: string): HfpApplEventInfo | null {
  const match = HFP_APPL_EVENT_RE.exec(raw);
  if (!match) return null;

  const event = parseHfpApplEventValue(match[1]);
  const instance = match[2];
  const result = parseInt(match[3], 16);

  if (Number.isNaN(event) || Number.isNaN(result)) return null;

  return {
    event,
    instance,
    result,
    eventName: getHfpApplEventName(event),
  };
}
