export interface DecodedResult {
  badge: 'hci' | 'iap2' | 'rpc' | 'status' | 'appcmd' | 'btn' | 'appmsg' | 'state' | 'a2dp' | 'profile';
  rawValue: string;
  hexValue: string;
  name: string;
  desc: string;
  matchText: string;
}

export interface LogEntry {
  id: number;
  raw: string;
  decoded: DecodedResult | null;
}

export interface DecodeTableEntry {
  name: string;
  desc: string;
  badge: 'hci' | 'iap2';
}

export interface ThumbMatch {
  line: number;
  decoded: DecodedResult;
}

export interface PanelSizes {
  leftWidth: number;
  thumbWidth: number;
}

export interface ParseResult {
    badge: string;
    rawValue: string;
    name: string;
    desc: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
}

export interface LogParser {
    name: string;
    pattern: RegExp;
    parse(match: RegExpMatchArray, line: string): ParseResult | null;
}

export type LinkState = 'unknown' | 'bt_off' | 'idle' | 'pairing' | 'connectable' | 'connected';
export type ProfileState = 'unknown' | 'disconnected' | 'connected' | 'streaming';
export type WwsTeamState = 'unknown' | 'disconnected' | 'pairing' | 'connected' | 'paired';
export type TeamingState = 'unknown' | 'idle' | 'syncing';
export type MultipointState = 'unknown' | 'off' | 'on';
export type PhoneCountState = 'unknown' | 'none' | 'one' | 'two';
export type TwsRoleState = 'unknown' | 'master' | 'slave';

export interface ConnectedDeviceInfo {
  name: string | null;
  address: string | null;
}

export interface CoreMemoryInfo {
  total: number;
  free: number;
  lowest: number;
}

export interface FeatResInfo {
  en: number;
  usr: bigint;
  msk: bigint;
  mod: number;
  exp: string;
  use: string;
  activeModules: string[];
}

export interface TrafficInfo {
  trafficKbps: number;
  leCurrent: number;
  leTotal: number;
  scoCurrent: number;
  scoTotal: number;
  pktLen: number;
  jitter: number;
  sampleMd: number;
}

export interface BatteryInfo {
  volt: number;
  lvl: number;
  lastLevel: number;
  charging: boolean;
  mv: number;
}

export interface WwsRssiInfo {
  crcErr: number;
  seqErr: number;
  phoneRssi: number;
  wwsRssi: number;
}

export type StatusFieldKey =
  | 'multipoint'
  | 'phoneCount'
  | 'primaryPhone'
  | 'isMusicPlaying'
  | 'isInCall'
  | 'inBox'
  | 'charging'
  | 'linkState'
  | 'a2dp'
  | 'a2dpVolume'
  | 'hfp'
  | 'hfpVolume'
  | 'wwsTeam'
  | 'twsRole'
  | 'sysState'
  | 'phoneName'
  | 'phoneAddress'
  | 'linkKey'
  | 'mtu'
  | 'cpuIdleA'
  | 'cpuIdleB'
  | 'cpuIdleD'
  | 'memA'
  | 'memB'
  | 'memD'
  | 'featRes'
  | 'traffic'
  | 'battery'
  | 'wwsRssi'
  | 'lastEvent';

export interface StatusSourceLines {
  multipoint: number | null;
  phoneCount: number | null;
  primaryPhone: number | null;
  isMusicPlaying: number | null;
  isInCall: number | null;
  inBox: number | null;
  charging: number | null;
  linkState: number | null;
  a2dp: number | null;
  a2dpVolume: number | null;
  hfp: number | null;
  hfpVolume: number | null;
  wwsTeam: number | null;
  twsRole: number | null;
  sysState: number | null;
  phoneName: number | null;
  phoneAddress: number | null;
  linkKey: number | null;
  mtu: number | null;
  cpuIdleA: number | null;
  cpuIdleB: number | null;
  cpuIdleD: number | null;
  memA: number | null;
  memB: number | null;
  memD: number | null;
  featRes: number | null;
  traffic: number | null;
  battery: number | null;
  wwsRssi: number | null;
  lastEvent: number | null;
}

export interface DeviceStatusSnapshot {
  asOfLine: number;
  sysStateMask: number;
  sysStateLabels: string[];
  linkState: LinkState;
  inBox: boolean | null;
  charging: boolean | null;
  a2dp: ProfileState;
  hfp: ProfileState;
  hfpState: number | null;
  wwsTeam: WwsTeamState;
  twsRole: TwsRoleState;
  teaming: TeamingState;
  multipoint: MultipointState;
  connectedPhoneIndices: number[];
  primaryPhoneIndex: number | null;
  isMusicPlaying: boolean;
  isInCall: boolean;
  a2dpVolume: number | null;
  hfpVolume: number | null;
  connectedDevices: Record<number, ConnectedDeviceInfo>;
  linkKey: string | null;
  mtu: number | null;
  cpuIdleA: number | null;
  cpuIdleB: number | null;
  cpuIdleD: number | null;
  memA: CoreMemoryInfo | null;
  memB: CoreMemoryInfo | null;
  memD: CoreMemoryInfo | null;
  featRes: FeatResInfo | null;
  traffic: TrafficInfo | null;
  battery: BatteryInfo | null;
  wwsRssi: WwsRssiInfo | null;
  lastEvent: string;
  sourceLines: StatusSourceLines;
}

export interface StatusCheckpoint {
  lineIndex: number;
  snapshot: DeviceStatusSnapshot;
}