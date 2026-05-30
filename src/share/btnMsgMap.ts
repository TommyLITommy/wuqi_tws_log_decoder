export const KEY_FUN_MAP: Record<number, string> = {
  0: "UI_SLAVE_BTN_HANDLE",
  1: "UI_WEAR_STATUS_SYN_HANDLE",
  2: "UI_PEER_WEAR_STATUS_UPDATA",
  3: "UI_WEAR_PAUSE_FLAG_UPDATA",
  4: "UI_TAP_STATUS_SYN_HANDLE",
  5: "UI_RESTART_AUTO_POWER_OFF_SYN_HANDLE",
  6: "UI_1S_TIMER_FUNC_HANDLER",
  7: "UI_BTN_SEND_SYNC_STATUS",
  8: "UI_BTN_WEAR_TWS_ROLE_CHANGE",
  9: "UI_BTN_UNWEAR_TWS_ROLE_CHANGE",
  10: "UI_INEAR_WWS_SWITCH",
  11: "UI_BTN_FUN_SYN",
  12: "UI_AI_STATUS_SYN",
  13: "UI_BTN_HANDLE_MAX",
};

export function getKeyFunName(msgId: number): string {
  return KEY_FUN_MAP[msgId] || `未知功能 (0x${msgId.toString(16).toUpperCase().padStart(2, '0')})`;
}