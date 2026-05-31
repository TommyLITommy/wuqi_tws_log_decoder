import type { ProfileState } from '@/types';

/** 匹配 BT_EVT_HFP_STATE_CHANGED 1=>3 index:0 primary:1 */
export const HFP_STATE_CHANGE_RE =
  /BT_EVT_HFP_STATE_CHANGED\s+(\d+)\s*=>\s*(\d+)(?:\s+index:(\d+))?(?:\s+primary:(\d+))?/;

/** bt_hfp_state_t */
export const HFP_STATE_MAP: Record<number, string> = {
  0: 'HFP_STATE_DISABLED',
  1: 'HFP_STATE_DISCONNECTED',
  2: 'HFP_STATE_CONNECTING',
  3: 'HFP_STATE_CONNECTED',
  4: 'HFP_STATE_INCOMING_CALL',
  5: 'HFP_STATE_OUTGOING_CALL',
  6: 'HFP_STATE_ACTIVE_CALL',
  7: 'HFP_STATE_TWC_CALL_WAITING',
  8: 'HFP_STATE_TWC_CALL_ON_HELD',
  9: 'HFP_STATE_ON_HELD_NO_ACTIVE',
};

export function getHfpStateName(state: number): string {
  return HFP_STATE_MAP[state] ?? `UNKNOWN(${state})`;
}

export function mapHfpStateToProfile(state: number): ProfileState {
  if (state === 3 || (state >= 4 && state <= 9)) return 'connected';
  if (state === 2) return 'unknown';
  if (state <= 1) return 'disconnected';
  return 'unknown';
}

export function isHfpInCallState(state: number): boolean {
  return state >= 4 && state <= 9;
}

export function formatHfpStateLabel(state: number | null): string {
  if (state === null) return '未知';
  return getHfpStateName(state).replace(/^HFP_STATE_/, '');
}

export function toneForHfpState(state: number | null): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (state === null) return 'default';
  if (state >= 4 && state <= 9) return 'warning';
  if (state === 3) return 'success';
  if (state === 2) return 'info';
  if (state <= 1) return 'danger';
  return 'default';
}
