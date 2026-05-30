export const STATE_BIT_MAP: Record<number, string> = {
  0x0001: "bt not enabled",
  0x0002: "wws pairing",
  0x0004: "idle",
  0x0008: "connectable",
  0x0010: "ag pairing",
  0x0020: "connected",
  0x0040: "a2dp streaming",
  0x0080: "incoming call",
  0x0100: "outgoing call",
  0x0200: "active call",
  0x0400: "three way call waiting",
  0x0800: "three way call on held",
  0x1000: "local music play",
  0x4000: "customized state 1",
  0x8000: "customized state 2",
};

export function decodeState(stateValue: number): string[] {
  if (stateValue === 0) return ["none"];
  const states: string[] = [];
  for (const bitValue of Object.keys(STATE_BIT_MAP).map(Number).sort((a, b) => a - b)) {
    if (stateValue & bitValue) {
      states.push(STATE_BIT_MAP[bitValue]);
    }
  }
  return states;
}