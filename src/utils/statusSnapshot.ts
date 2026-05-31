import { decodeState } from '@/share/stateBitMap';
import { getA2dpStateName, mapA2dpStateToProfile, A2DP_STATE_CHANGE_RE } from '@/share/a2dpStateMap';
import {
  getHfpStateName,
  mapHfpStateToProfile,
  isHfpInCallState,
  HFP_STATE_CHANGE_RE,
  formatHfpStateLabel,
  toneForHfpState,
} from '@/share/hfpStateMap';
import {
  CM_CONNECTED_RE,
  CM_DISCONNECTED_RE,
  MULTIPOINT_OFF_RE,
  MULTIPOINT_ON_RE,
  MULTIPOINT_PRIMARY_RE,
} from '@/share/multipointLog';
import { PROFILE_CONNECT_IND_SIG_RE, TDS_PROFILE_FLAG, parseProfileConnectFlags } from '@/share/tdsProfileFlag';
import {
  applyDeviceInfoLog,
  clearDeviceInfo,
  clearAllDeviceInfo,
  deviceAddressesChanged,
  deviceNamesChanged,
  devicesSnapshotEqual,
  formatPhoneAddress,
  formatPhoneName,
  getDisplayDeviceIndices,
  phoneAddressLabel,
  phoneNameLabel,
} from '@/share/deviceInfoLog';
import { applyMasterRoleLog, applyWwsRoleChangedLog } from '@/share/masterRoleLog';
import { applyVolumeLog } from '@/share/volumeLog';
import { applyCpuUsageLog } from '@/share/cpuUsageLog';
import { applyMemUsageLog, memInfoEqual } from '@/share/memUsageLog';
import { applyFeatResLog, featResEqual } from '@/share/featResLog';
import { applyTrafficLog, trafficEqual } from '@/share/trafficLog';
import { applyBatteryLog, batteryEqual } from '@/share/batteryLog';
import { applyWwsRssiLog, wwsRssiEqual } from '@/share/wwsRssiLog';
import { applyLinkKeyLog } from '@/share/linkKeyLog';
import { applyMtuLog } from '@/share/mtuLog';
import { getMsgString } from '@/share/msgTypeMap';
import type {
  CoreMemoryInfo,
  DeviceStatusSnapshot,
  FeatResInfo,
  TrafficInfo,
  BatteryInfo,
  LinkState,
  MultipointState,
  PhoneCountState,
  ProfileState,
  StatusCheckpoint,
  StatusSourceLines,
  TeamingState,
  TwsRoleState,
  WwsTeamState,
} from '@/types';
import { ITEM_HEIGHT } from '@/utils/constants';

const CHECKPOINT_INTERVAL = 500;

function createEmptySourceLines(): StatusSourceLines {
  return {
    multipoint: null,
    phoneCount: null,
    primaryPhone: null,
    isMusicPlaying: null,
    isInCall: null,
    inBox: null,
    charging: null,
    linkState: null,
    a2dp: null,
    a2dpVolume: null,
    hfp: null,
    hfpVolume: null,
    wwsTeam: null,
    twsRole: null,
    sysState: null,
    phoneName: null,
    phoneAddress: null,
    linkKey: null,
    mtu: null,
    cpuIdleA: null,
    cpuIdleB: null,
    cpuIdleD: null,
    memA: null,
    memB: null,
    memD: null,
    featRes: null,
    traffic: null,
    battery: null,
    wwsRssi: null,
    lastEvent: null,
  };
}

function trackSourceLines(before: DeviceStatusSnapshot, after: DeviceStatusSnapshot, lineIndex: number) {
  const src = after.sourceLines;
  if (before.multipoint !== after.multipoint) src.multipoint = lineIndex;
  if (before.primaryPhoneIndex !== after.primaryPhoneIndex) src.primaryPhone = lineIndex;
  if (before.isMusicPlaying !== after.isMusicPlaying) src.isMusicPlaying = lineIndex;
  if (before.isInCall !== after.isInCall) src.isInCall = lineIndex;
  if (before.inBox !== after.inBox) src.inBox = lineIndex;
  if (before.charging !== after.charging) src.charging = lineIndex;
  if (before.linkState !== after.linkState) src.linkState = lineIndex;
  if (before.a2dp !== after.a2dp) src.a2dp = lineIndex;
  if (before.a2dpVolume !== after.a2dpVolume) src.a2dpVolume = lineIndex;
  if (before.hfp !== after.hfp) src.hfp = lineIndex;
  if (before.hfpState !== after.hfpState) src.hfp = lineIndex;
  if (before.hfpVolume !== after.hfpVolume) src.hfpVolume = lineIndex;
  if (before.wwsTeam !== after.wwsTeam) src.wwsTeam = lineIndex;
  if (before.twsRole !== after.twsRole) src.twsRole = lineIndex;
  if (before.sysStateMask !== after.sysStateMask) src.sysState = lineIndex;
  if (deviceNamesChanged(before.connectedDevices, after.connectedDevices)) src.phoneName = lineIndex;
  if (deviceAddressesChanged(before.connectedDevices, after.connectedDevices)) src.phoneAddress = lineIndex;
  if (before.linkKey !== after.linkKey) src.linkKey = lineIndex;
  if (before.mtu !== after.mtu) src.mtu = lineIndex;
  if (before.cpuIdleA !== after.cpuIdleA) src.cpuIdleA = lineIndex;
  if (before.cpuIdleB !== after.cpuIdleB) src.cpuIdleB = lineIndex;
  if (before.cpuIdleD !== after.cpuIdleD) src.cpuIdleD = lineIndex;
  if (!memInfoEqual(before.memA, after.memA)) src.memA = lineIndex;
  if (!memInfoEqual(before.memB, after.memB)) src.memB = lineIndex;
  if (!memInfoEqual(before.memD, after.memD)) src.memD = lineIndex;
  if (!featResEqual(before.featRes, after.featRes)) src.featRes = lineIndex;
  if (!trafficEqual(before.traffic, after.traffic)) src.traffic = lineIndex;
  if (!batteryEqual(before.battery, after.battery)) src.battery = lineIndex;
  if (!wwsRssiEqual(before.wwsRssi, after.wwsRssi)) src.wwsRssi = lineIndex;
  if (before.connectedPhoneIndices.join(',') !== after.connectedPhoneIndices.join(',')) src.phoneCount = lineIndex;
  if (before.lastEvent !== after.lastEvent) src.lastEvent = lineIndex;
}

const STATE_CHANGE_RE = /(?:EVTSYS_STATE_CHANGED|sys_state)\s+(0x[0-9a-fA-F]+)\s*->\s*(0x[0-9a-fA-F]+)/;
const EVTSYS_RE = /\b(EVTSYS_[A-Z0-9_]+)\b/g;
const MSG_TYPE_ID_RE = /type:\s*(\d+)\s+id:\s*(\d+)/gi;
const RPC_CMD_RE = /wq_send_rpc_cmd\s+([0-9A-Fa-f]{4})\s+ret=(\d+)/g;
const NAMED_EVENT_RE = /\b((?:CHARGER|BAT|IMU|APP_WWS|CONN)_[A-Z0-9_]+)\b/g;

const RPC_HFP_CONNECT = 0x0702;
const RPC_HFP_DISCONNECT = 0x0703;
const RPC_A2DP_CONNECT = 0x0803;
const RPC_A2DP_DISCONNECT = 0x0804;
const RPC_TWS_START_PAIR = 0x0203;
const RPC_BT_CONNECT = 0x0008;
const RPC_BT_DISCONNECT = 0x0009;
const RPC_SET_MULTIPOINT_PRIMARY = 0x001f;

const CALL_STATE_MASK = 0x0080 | 0x0100 | 0x0200 | 0x0400 | 0x0800;
const MUSIC_STATE_MASK = 0x0040 | 0x1000;

function createEmptySnapshot(): DeviceStatusSnapshot {
  return {
    asOfLine: 0,
    sysStateMask: 0,
    sysStateLabels: ['none'],
    linkState: 'unknown',
    inBox: null,
    charging: null,
    a2dp: 'unknown',
    hfp: 'unknown',
    hfpState: null,
    wwsTeam: 'unknown',
    twsRole: 'unknown',
    teaming: 'unknown',
    multipoint: 'unknown',
    connectedPhoneIndices: [],
    primaryPhoneIndex: null,
    isMusicPlaying: false,
    isInCall: false,
    a2dpVolume: null,
    hfpVolume: null,
    connectedDevices: {},
    linkKey: null,
    mtu: null,
    cpuIdleA: null,
    cpuIdleB: null,
    cpuIdleD: null,
    memA: null,
    memB: null,
    memD: null,
    featRes: null,
    traffic: null,
    battery: null,
    wwsRssi: null,
    lastEvent: '',
    sourceLines: createEmptySourceLines(),
  };
}

function cloneSnapshot(snapshot: DeviceStatusSnapshot): DeviceStatusSnapshot {
  return {
    ...snapshot,
    sysStateLabels: [...snapshot.sysStateLabels],
    connectedPhoneIndices: [...snapshot.connectedPhoneIndices],
    connectedDevices: Object.fromEntries(
      Object.entries(snapshot.connectedDevices).map(([key, value]) => [Number(key), { ...value }])
    ),
    sourceLines: { ...snapshot.sourceLines },
    memA: snapshot.memA ? { ...snapshot.memA } : null,
    memB: snapshot.memB ? { ...snapshot.memB } : null,
    memD: snapshot.memD ? { ...snapshot.memD } : null,
    featRes: snapshot.featRes
      ? { ...snapshot.featRes, activeModules: [...snapshot.featRes.activeModules] }
      : null,
    traffic: snapshot.traffic ? { ...snapshot.traffic } : null,
    battery: snapshot.battery ? { ...snapshot.battery } : null,
    wwsRssi: snapshot.wwsRssi ? { ...snapshot.wwsRssi } : null,
  };
}

function syncMediaAndCallFromMask(snapshot: DeviceStatusSnapshot, mask: number) {
  snapshot.isMusicPlaying = !!(mask & MUSIC_STATE_MASK);
  snapshot.isInCall = !!(mask & CALL_STATE_MASK);
}

function markPhoneConnected(snapshot: DeviceStatusSnapshot, index: number) {
  if (!snapshot.connectedPhoneIndices.includes(index)) {
    snapshot.connectedPhoneIndices.push(index);
    snapshot.connectedPhoneIndices.sort((a, b) => a - b);
  }
}

function markPhoneDisconnected(snapshot: DeviceStatusSnapshot, index: number) {
  snapshot.connectedPhoneIndices = snapshot.connectedPhoneIndices.filter(i => i !== index);
  clearDeviceInfo(snapshot, index);
  if (snapshot.primaryPhoneIndex === index) {
    snapshot.primaryPhoneIndex = snapshot.connectedPhoneIndices[0] ?? null;
  }
}

function applyMultipointLog(snapshot: DeviceStatusSnapshot, raw: string) {
  if (MULTIPOINT_ON_RE.test(raw)) snapshot.multipoint = 'on';
  else if (MULTIPOINT_OFF_RE.test(raw)) snapshot.multipoint = 'off';

  const primaryMatch = MULTIPOINT_PRIMARY_RE.exec(raw);
  if (primaryMatch) {
    snapshot.primaryPhoneIndex = parseInt(primaryMatch[1], 10);
  }
}

function applyCmConnectionLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const connectedMatch = CM_CONNECTED_RE.exec(raw);
  if (connectedMatch) {
    markPhoneConnected(snapshot, parseInt(connectedMatch[1], 10));
    snapshot.lastEvent = connectedMatch[0];
    return;
  }

  const disconnectedMatch = CM_DISCONNECTED_RE.exec(raw);
  if (disconnectedMatch) {
    markPhoneDisconnected(snapshot, parseInt(disconnectedMatch[1], 10));
    snapshot.lastEvent = disconnectedMatch[0];
  }
}

function syncSysState(snapshot: DeviceStatusSnapshot, mask: number) {
  snapshot.sysStateMask = mask;
  snapshot.sysStateLabels = decodeState(mask);

  if (mask & 0x0020) {
    snapshot.linkState = 'connected';
    if (mask & 0x0040) snapshot.a2dp = 'streaming';
    else if (snapshot.a2dp === 'streaming') snapshot.a2dp = 'connected';
  } else if (mask & 0x0002 || mask & 0x0010) {
    snapshot.linkState = 'pairing';
    snapshot.a2dp = 'disconnected';
    snapshot.hfp = 'disconnected';
  } else if (mask & 0x0008) {
    snapshot.linkState = 'connectable';
    snapshot.a2dp = 'disconnected';
    snapshot.hfp = 'disconnected';
  } else if (mask & 0x0004) {
    snapshot.linkState = 'idle';
    snapshot.a2dp = 'disconnected';
    snapshot.hfp = 'disconnected';
  } else if (mask & 0x0001) {
    snapshot.linkState = 'bt_off';
    snapshot.a2dp = 'disconnected';
    snapshot.hfp = 'disconnected';
  }

  if (mask & 0x0002) snapshot.wwsTeam = 'pairing';

  syncMediaAndCallFromMask(snapshot, mask);
}

/** 连接非 Connected 时，A2DP/HFP 不应保持已连接 */
function reconcileProfilesWithLink(snapshot: DeviceStatusSnapshot) {
  if (snapshot.linkState !== 'connected') {
    snapshot.a2dp = 'disconnected';
    snapshot.hfp = 'disconnected';
    snapshot.isMusicPlaying = false;
    snapshot.isInCall = false;
  }
}

function canProfileConnect(snapshot: DeviceStatusSnapshot): boolean {
  return snapshot.linkState === 'connected';
}

function applyBtEvtA2dpState(snapshot: DeviceStatusSnapshot, match: RegExpExecArray) {
  const newState = parseInt(match[2], 10);
  snapshot.a2dp = mapA2dpStateToProfile(newState);
  snapshot.lastEvent = `BT_EVT_A2DP_STATE_CHANGED → ${getA2dpStateName(newState)}`;

  if (newState === 4) snapshot.isMusicPlaying = true;
  if (newState <= 1) snapshot.isMusicPlaying = false;

  if (match[3] !== undefined && match[4] === '1') {
    snapshot.primaryPhoneIndex = parseInt(match[3], 10);
  }
}

function applyBtEvtHfpState(snapshot: DeviceStatusSnapshot, match: RegExpExecArray) {
  const newState = parseInt(match[2], 10);
  snapshot.hfpState = newState;
  snapshot.hfp = mapHfpStateToProfile(newState);
  snapshot.lastEvent = `BT_EVT_HFP_STATE_CHANGED → ${getHfpStateName(newState)}`;
  snapshot.isInCall = isHfpInCallState(newState);

  if (match[3] !== undefined && match[4] === '1') {
    snapshot.primaryPhoneIndex = parseInt(match[3], 10);
  }
}

function applyProfileConnectInd(snapshot: DeviceStatusSnapshot, peProfileFlag: number, meProfileFlag: number) {
  const applyMask = (mask: number) => {
    if (mask & TDS_PROFILE_FLAG.HF) snapshot.hfp = 'connected';
    if (mask & TDS_PROFILE_FLAG.A2DP) snapshot.a2dp = 'connected';
  };

  applyMask(peProfileFlag);
  applyMask(meProfileFlag);

  const combined = peProfileFlag | meProfileFlag;
  if (combined !== 0 && snapshot.linkState !== 'pairing' && snapshot.linkState !== 'bt_off') {
    snapshot.linkState = 'connected';
  }

  snapshot.lastEvent =
    `PROFILE_CONNECT_IND_SIG pe=0x${peProfileFlag.toString(16).toUpperCase()} me=0x${meProfileFlag.toString(16).toUpperCase()}`;
}

function applyEvtsys(snapshot: DeviceStatusSnapshot, event: string) {
  snapshot.lastEvent = event;

  switch (event) {
    case 'EVTSYS_PUT_IN':
    case 'EVTSYS_CMC_BOX_CLOSE':
      snapshot.inBox = true;
      snapshot.charging = true;
      break;
    case 'EVTSYS_TAKE_OUT':
    case 'EVTSYS_CMC_BOX_OPEN':
      snapshot.inBox = false;
      snapshot.charging = false;
      break;
    case 'EVTSYS_CHARGE_COMPLETE':
      snapshot.charging = false;
      break;
    case 'EVTSYS_A2DP_CONNECTED':
      if (canProfileConnect(snapshot)) snapshot.a2dp = 'connected';
      break;
    case 'EVTSYS_A2DP_DISCONNECTED':
      snapshot.a2dp = 'disconnected';
      break;
    case 'EVTSYS_HFP_CONNECTED':
      if (canProfileConnect(snapshot)) snapshot.hfp = 'connected';
      break;
    case 'EVTSYS_HFP_DISCONNECTED':
      snapshot.hfp = 'disconnected';
      break;
    case 'EVTSYS_RING':
    case 'EVTSYS_SCOLINK_OPEN':
      snapshot.isInCall = true;
      break;
    case 'EVTSYS_CALL_END':
    case 'EVTSYS_SCOLINK_CLOSE':
      snapshot.isInCall = false;
      break;
    case 'EVTSYS_MUSIC_PLAY':
      snapshot.isMusicPlaying = true;
      break;
    case 'EVTSYS_MUSIC_PAUSE':
    case 'EVTSYS_MUSIC_STOP':
      snapshot.isMusicPlaying = false;
      break;
    case 'EVTSYS_CONNECTED':
      snapshot.linkState = 'connected';
      break;
    case 'EVTSYS_DISCONNECTED':
    case 'EVTSYS_LINK_LOSS':
      snapshot.linkState = 'idle';
      snapshot.a2dp = 'disconnected';
      snapshot.hfp = 'disconnected';
      snapshot.isMusicPlaying = false;
      snapshot.isInCall = false;
      snapshot.connectedPhoneIndices = [];
      snapshot.primaryPhoneIndex = null;
      clearAllDeviceInfo(snapshot);
      break;
    case 'EVTSYS_ENTER_PAIRING':
    case 'EVTSYS_WWS_PAIR_FAILED':
      snapshot.linkState = 'pairing';
      break;
    case 'EVTSYS_WWS_CONNECTED':
      snapshot.wwsTeam = 'connected';
      break;
    case 'EVTSYS_WWS_DISCONNECTED':
      snapshot.wwsTeam = 'disconnected';
      break;
    case 'EVTSYS_WWS_PAIRED':
      snapshot.wwsTeam = 'paired';
      break;
    case 'EVTSYS_BT_POWER_OFF':
      snapshot.linkState = 'bt_off';
      snapshot.a2dp = 'disconnected';
      snapshot.hfp = 'disconnected';
      snapshot.connectedPhoneIndices = [];
      snapshot.primaryPhoneIndex = null;
      clearAllDeviceInfo(snapshot);
      break;
    case 'EVTSYS_BT_POWER_ON':
      snapshot.linkState = 'idle';
      snapshot.a2dp = 'disconnected';
      snapshot.hfp = 'disconnected';
      break;
    default:
      break;
  }
}

function applyNamedEvent(snapshot: DeviceStatusSnapshot, event: string) {
  snapshot.lastEvent = event;

  if (event.includes('TEAMING_')) {
    snapshot.teaming = 'syncing';
    return;
  }
  if (event === 'CHARGER_MSG_ID_REMOTE_DATA_IN_BOX') {
    snapshot.inBox = true;
    snapshot.charging = true;
  }
  if (event === 'CHARGER_MSG_ID_REMOTE_DATA_BOX_STATE') {
    snapshot.inBox = true;
  }
  if (event === 'BAT_MSG_ID_FULL') {
    snapshot.charging = false;
  }
  if (event === 'APP_WWS_MSG_ID_REPORT_CONNECTED') {
    snapshot.wwsTeam = 'connected';
  }
}

function applyRpc(snapshot: DeviceStatusSnapshot, cmdId: number, ret: number) {
  if (ret !== 0) return;

  switch (cmdId) {
    case RPC_HFP_CONNECT:
      if (canProfileConnect(snapshot)) snapshot.hfp = 'connected';
      snapshot.lastEvent = 'BT_CMD_HFP_CONNECT';
      break;
    case RPC_HFP_DISCONNECT:
      snapshot.hfp = 'disconnected';
      snapshot.lastEvent = 'BT_CMD_HFP_DISCONNECT';
      break;
    case RPC_A2DP_CONNECT:
      if (canProfileConnect(snapshot)) snapshot.a2dp = 'connected';
      snapshot.lastEvent = 'BT_CMD_A2DP_CONNECT';
      break;
    case RPC_A2DP_DISCONNECT:
      snapshot.a2dp = 'disconnected';
      snapshot.lastEvent = 'BT_CMD_A2DP_DISCONNECT';
      break;
    case RPC_TWS_START_PAIR:
      snapshot.wwsTeam = 'pairing';
      snapshot.lastEvent = 'BT_CMD_TWS_START_PAIR';
      break;
    case RPC_BT_CONNECT:
      snapshot.linkState = 'connected';
      snapshot.lastEvent = 'BT_CMD_CONNECT';
      break;
    case RPC_BT_DISCONNECT:
      snapshot.linkState = 'idle';
      snapshot.a2dp = 'disconnected';
      snapshot.hfp = 'disconnected';
      snapshot.isMusicPlaying = false;
      snapshot.isInCall = false;
      snapshot.connectedPhoneIndices = [];
      snapshot.primaryPhoneIndex = null;
      clearAllDeviceInfo(snapshot);
      snapshot.lastEvent = 'BT_CMD_DISCONNECT';
      break;
    case RPC_SET_MULTIPOINT_PRIMARY:
      snapshot.lastEvent = 'BT_CMD_SET_MULTIPOINT_PRIMARY';
      break;
    default:
      break;
  }
}

function applyLine(snapshot: DeviceStatusSnapshot, raw: string, lineIndex: number, before?: DeviceStatusSnapshot) {
  const prev = before ?? cloneSnapshot(snapshot);
  snapshot.asOfLine = lineIndex + 1;

  const stateMatch = STATE_CHANGE_RE.exec(raw);
  if (stateMatch) {
    const newVal = parseInt(stateMatch[2], 16);
    syncSysState(snapshot, newVal);
    snapshot.lastEvent = 'EVTSYS_STATE_CHANGED';
  }

  EVTSYS_RE.lastIndex = 0;
  let evtsysMatch: RegExpExecArray | null;
  while ((evtsysMatch = EVTSYS_RE.exec(raw)) !== null) {
    applyEvtsys(snapshot, evtsysMatch[1]);
  }

  MSG_TYPE_ID_RE.lastIndex = 0;
  let msgMatch: RegExpExecArray | null;
  while ((msgMatch = MSG_TYPE_ID_RE.exec(raw)) !== null) {
    const msgName = getMsgString(parseInt(msgMatch[1], 10), parseInt(msgMatch[2], 10));
    const shortName = msgName.split('::').pop() || msgName;
    if (shortName.startsWith('EVTSYS_')) applyEvtsys(snapshot, shortName);
    else applyNamedEvent(snapshot, shortName);
  }

  NAMED_EVENT_RE.lastIndex = 0;
  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = NAMED_EVENT_RE.exec(raw)) !== null) {
    applyNamedEvent(snapshot, namedMatch[1]);
  }

  RPC_CMD_RE.lastIndex = 0;
  let rpcMatch: RegExpExecArray | null;
  while ((rpcMatch = RPC_CMD_RE.exec(raw)) !== null) {
    applyRpc(snapshot, parseInt(rpcMatch[1], 16), parseInt(rpcMatch[2], 10));
  }

  applyMultipointLog(snapshot, raw);
  applyCmConnectionLog(snapshot, raw);
  applyDeviceInfoLog(snapshot, raw);
  applyMasterRoleLog(snapshot, raw);
  applyWwsRoleChangedLog(snapshot, raw);
  applyVolumeLog(snapshot, raw);
  applyCpuUsageLog(snapshot, raw);
  applyMemUsageLog(snapshot, raw);
  applyFeatResLog(snapshot, raw);
  applyTrafficLog(snapshot, raw);
  applyBatteryLog(snapshot, raw);
  applyWwsRssiLog(snapshot, raw);
  applyLinkKeyLog(snapshot, raw);
  applyMtuLog(snapshot, raw);

  const a2dpStateMatch = A2DP_STATE_CHANGE_RE.exec(raw);
  if (a2dpStateMatch) {
    applyBtEvtA2dpState(snapshot, a2dpStateMatch);
  }

  const hfpStateMatch = HFP_STATE_CHANGE_RE.exec(raw);
  if (hfpStateMatch) {
    applyBtEvtHfpState(snapshot, hfpStateMatch);
  }

  const profileConnectMatch = PROFILE_CONNECT_IND_SIG_RE.exec(raw);
  if (profileConnectMatch) {
    const { peProfileFlag, meProfileFlag } = parseProfileConnectFlags(profileConnectMatch);
    applyProfileConnectInd(snapshot, peProfileFlag, meProfileFlag);
  }

  reconcileProfilesWithLink(snapshot);

  if (snapshot.connectedPhoneIndices.length >= 2) {
    snapshot.multipoint = 'on';
  }

  trackSourceLines(prev, snapshot, lineIndex);
}

function snapshotChanged(a: DeviceStatusSnapshot, b: DeviceStatusSnapshot): boolean {
  return a.sysStateMask !== b.sysStateMask
    || a.linkState !== b.linkState
    || a.inBox !== b.inBox
    || a.charging !== b.charging
    || a.a2dp !== b.a2dp
    || a.hfp !== b.hfp
    || a.hfpState !== b.hfpState
    || a.wwsTeam !== b.wwsTeam
    || a.twsRole !== b.twsRole
    || a.teaming !== b.teaming
    || a.multipoint !== b.multipoint
    || a.primaryPhoneIndex !== b.primaryPhoneIndex
    || a.isMusicPlaying !== b.isMusicPlaying
    || a.isInCall !== b.isInCall
    || a.a2dpVolume !== b.a2dpVolume
    || a.hfpVolume !== b.hfpVolume
    || a.cpuIdleA !== b.cpuIdleA
    || a.cpuIdleB !== b.cpuIdleB
    || a.cpuIdleD !== b.cpuIdleD
    || !memInfoEqual(a.memA, b.memA)
    || !memInfoEqual(a.memB, b.memB)
    || !memInfoEqual(a.memD, b.memD)
    || !featResEqual(a.featRes, b.featRes)
    || !trafficEqual(a.traffic, b.traffic)
    || !batteryEqual(a.battery, b.battery)
    || !wwsRssiEqual(a.wwsRssi, b.wwsRssi)
    || a.linkKey !== b.linkKey
    || a.mtu !== b.mtu
    || !devicesSnapshotEqual(a.connectedDevices, b.connectedDevices)
    || a.connectedPhoneIndices.join(',') !== b.connectedPhoneIndices.join(',')
    || a.lastEvent !== b.lastEvent;
}

export function buildStatusCheckpoints(logLines: string[]): StatusCheckpoint[] {
  if (logLines.length === 0) return [];

  const checkpoints: StatusCheckpoint[] = [];
  let current = createEmptySnapshot();

  for (let i = 0; i < logLines.length; i++) {
    const before = cloneSnapshot(current);
    applyLine(current, logLines[i], i, before);

    if (i === 0 || i % CHECKPOINT_INTERVAL === 0 || snapshotChanged(before, current)) {
      checkpoints.push({ lineIndex: i, snapshot: cloneSnapshot(current) });
    }
  }

  return checkpoints;
}

export function getStatusAtLine(
  checkpoints: StatusCheckpoint[],
  logLines: string[],
  lineIndex: number
): DeviceStatusSnapshot {
  if (logLines.length === 0) return createEmptySnapshot();

  const target = Math.max(0, Math.min(lineIndex, logLines.length - 1));
  if (checkpoints.length === 0) {
    const snapshot = createEmptySnapshot();
    for (let i = 0; i <= target; i++) {
      const before = cloneSnapshot(snapshot);
      applyLine(snapshot, logLines[i], i, before);
    }
    return snapshot;
  }

  let cpIdx = 0;
  for (let i = 1; i < checkpoints.length; i++) {
    if (checkpoints[i].lineIndex <= target) cpIdx = i;
    else break;
  }

  const snapshot = cloneSnapshot(checkpoints[cpIdx].snapshot);
  for (let i = checkpoints[cpIdx].lineIndex + 1; i <= target; i++) {
    const before = cloneSnapshot(snapshot);
    applyLine(snapshot, logLines[i], i, before);
  }
  return snapshot;
}

export function getViewportEndLogIndex(
  scrollTop: number,
  clientHeight: number,
  filteredIndices: number[]
): number {
  if (filteredIndices.length === 0) return 0;

  const lastFilteredIdx = Math.min(
    filteredIndices.length - 1,
    Math.max(0, Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) - 1)
  );
  return filteredIndices[lastFilteredIdx];
}

export function formatLinkState(state: LinkState): string {
  const map: Record<LinkState, string> = {
    unknown: '未知',
    bt_off: '蓝牙关闭',
    idle: 'Idle',
    pairing: 'Pairing',
    connectable: '可连接',
    connected: 'Connected',
  };
  return map[state];
}

export function formatTriState(value: boolean | null, trueLabel: string, falseLabel: string): string {
  if (value === true) return trueLabel;
  if (value === false) return falseLabel;
  return '未知';
}

export function formatProfileState(state: ProfileState): string {
  if (state === 'streaming') return '播放中';
  if (state === 'connected') return '已连接';
  if (state === 'disconnected') return '未连接';
  return '未知';
}

export function formatHfpStatus(hfpState: number | null, hfp: ProfileState): string {
  if (hfpState !== null) return formatHfpStateLabel(hfpState);
  return formatProfileState(hfp);
}

export { formatHfpStateLabel, toneForHfpState };

export function formatWwsTeam(state: WwsTeamState): string {
  const map: Record<WwsTeamState, string> = {
    unknown: '未知',
    disconnected: '未组队',
    pairing: '配对中',
    connected: '已连接',
    paired: '已组队',
  };
  return map[state];
}

export function formatTwsRole(state: TwsRoleState): string {
  if (state === 'master') return 'Master';
  if (state === 'slave') return 'Slave';
  return '未知';
}

export function formatTeaming(state: TeamingState): string {
  const map: Record<TeamingState, string> = {
    unknown: '未知',
    idle: '空闲',
    syncing: '同步中',
  };
  return map[state];
}

export function formatMultipoint(state: MultipointState): string {
  const map: Record<MultipointState, string> = {
    unknown: '未知',
    off: '关闭',
    on: '开启',
  };
  return map[state];
}

export function getPhoneCountState(snapshot: DeviceStatusSnapshot): PhoneCountState {
  const count = snapshot.connectedPhoneIndices.length;
  if (count >= 2) return 'two';
  if (count === 1) return 'one';
  if (count === 0 && snapshot.linkState === 'connected') return 'one';
  if (count === 0) return snapshot.linkState === 'idle' || snapshot.linkState === 'bt_off' ? 'none' : 'unknown';
  return 'unknown';
}

export function formatPhoneCount(state: PhoneCountState): string {
  const map: Record<PhoneCountState, string> = {
    unknown: '未知',
    none: '未连接',
    one: '1 台',
    two: '2 台',
  };
  return map[state];
}

export function formatPrimaryPhone(index: number | null): string {
  if (index === null) return '未知';
  return `手机 ${index}`;
}

export function formatYesNo(value: boolean): string {
  return value ? '是' : '否';
}

export function formatVolume(value: number | null): string {
  if (value === null) return '未知';
  return String(value);
}

export function formatCpuIdle(value: number | null): string {
  if (value === null) return '未知';
  return `${value}%`;
}

export function toneForCpuIdle(value: number | null): 'default' | 'success' | 'warning' | 'danger' {
  if (value === null) return 'default';
  if (value >= 50) return 'success';
  if (value >= 30) return 'warning';
  return 'danger';
}

function formatBytesShort(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

export function formatMemUsage(info: CoreMemoryInfo | null): string {
  if (!info) return '未知';
  const usedPct = Math.round((1 - info.free / info.total) * 100);
  return `${usedPct}% ${formatBytesShort(info.free)}/${formatBytesShort(info.total)}`;
}

export function toneForMemUsage(info: CoreMemoryInfo | null): 'default' | 'success' | 'warning' | 'danger' {
  if (!info) return 'default';
  const freeRatio = info.free / info.total;
  if (freeRatio >= 0.5) return 'success';
  if (freeRatio >= 0.25) return 'warning';
  return 'danger';
}

export function formatFeatRes(info: FeatResInfo | null): string {
  if (!info) return '未知';
  const modules = info.activeModules
    .filter(m => m !== 'none')
    .map(m => m.replace(/^WQ_FEAT_RES_USR_/, ''))
    .join(', ');
  if (!modules) return '无';
  return `${modules} · use:${info.use}`;
}

export function formatFeatResTitle(info: FeatResInfo | null): string | undefined {
  if (!info) return undefined;
  return [
    `en:${info.en}`,
    `usr:0x${info.usr.toString(16).toUpperCase()}`,
    `msk:0x${info.msk.toString(16).toUpperCase()}`,
    `mod:${info.mod}`,
    `exp:${info.exp}`,
    `use:${info.use}`,
    `modules:${info.activeModules.join(', ')}`,
  ].join(' ');
}

export function formatTraffic(info: TrafficInfo | null): string {
  if (!info) return '未知';
  return `${info.trafficKbps}kb/s · sco ${info.scoCurrent}/${info.scoTotal}`;
}

export function formatTrafficTitle(info: TrafficInfo | null): string | undefined {
  if (!info) return undefined;
  return [
    `traffic:${info.trafficKbps}kb/s`,
    `le:${info.leCurrent}/${info.leTotal}`,
    `sco:${info.scoCurrent}/${info.scoTotal}`,
    `pkt_len:${info.pktLen}`,
    `jitter:${info.jitter}`,
    `sample_md:${info.sampleMd}`,
  ].join(' ');
}

export function toneForTraffic(info: TrafficInfo | null): 'default' | 'success' | 'warning' | 'danger' {
  if (!info) return 'default';
  if (info.scoCurrent > 0) return 'success';
  if (info.jitter >= 10000) return 'warning';
  if (info.trafficKbps > 0) return 'info';
  return 'default';
}

export function formatBatteryLevel(info: BatteryInfo | null): string {
  if (!info) return '未知';
  return `${info.lvl}%`;
}

export function formatBatteryVolt(info: BatteryInfo | null): string {
  if (!info) return '未知';
  return `${info.volt}mV`;
}

export function formatBatteryTitle(info: BatteryInfo | null): string | undefined {
  if (!info) return undefined;
  return [
    `volt:${info.volt}`,
    `lvl:${info.lvl}`,
    `last_level:${info.lastLevel}`,
    `charging:${info.charging ? 1 : 0}`,
    `MV:${info.mv}`,
  ].join(' ');
}

export function toneForBatteryLevel(info: BatteryInfo | null): 'default' | 'success' | 'warning' | 'danger' {
  if (!info) return 'default';
  if (info.charging) return 'success';
  if (info.lvl <= 20) return 'danger';
  if (info.lvl <= 50) return 'warning';
  return 'info';
}

export {
  formatLinkKey,
} from '@/share/linkKeyLog';

export {
  formatPhoneAddress,
  formatPhoneName,
  getDisplayDeviceIndices,
  phoneAddressLabel,
  phoneNameLabel,
} from '@/share/deviceInfoLog';

export {
  formatRssiDbm,
  toneForRssiDbm,
  formatWwsRssiTitle,
} from '@/share/wwsRssiLog';
