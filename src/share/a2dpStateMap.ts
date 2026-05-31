import type { ProfileState } from '@/types';

/** 匹配 BT_EVT_A2DP_STATE_CHANGED 1=>3 index:0 primary:1 */
export const A2DP_STATE_CHANGE_RE =
  /BT_EVT_A2DP_STATE_CHANGED\s+(\d+)\s*=>\s*(\d+)(?:\s+index:(\d+))?(?:\s+primary:(\d+))?/;

/** bt_a2dp_state_t */
export const A2DP_STATE_MAP: Record<number, string> = {
  0: 'A2DP_STATE_DISABLED',
  1: 'A2DP_STATE_DISCONNECTED',
  2: 'A2DP_STATE_CONNECTING',
  3: 'A2DP_STATE_CONNECTED',
  4: 'A2DP_STATE_STREAMING',
};

export function getA2dpStateName(state: number): string {
  return A2DP_STATE_MAP[state] ?? `UNKNOWN(${state})`;
}

export function mapA2dpStateToProfile(state: number): ProfileState {
  switch (state) {
    case 4:
      return 'streaming';
    case 3:
      return 'connected';
    case 2:
    case 1:
    case 0:
      return 'disconnected';
    default:
      return 'unknown';
  }
}
