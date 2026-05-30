export const APP_CMD_MAP: Record<number, Record<number, string>> = {
  0x01: {
    0x01: "sn", 
    0x02: "pn", 
    0x03: "color",
    0x04: "tws_l_firmver", 
    0x05: "tws_r_firmver",
    0x06: "tws_l_hardmver", 
    0x07: "tws_r_hardmver",
    0x08: "tws_l_battery", 
    0x09: "tws_r_battery",
    0x0A: "tws_l_mac", 
    0x0B: "tws_r_mac",
    0x0C: "tws_status", 
    0x0D: "chargebox_bat",
    0x0E: "tws_l_r_battery", 
    0x20: "printf",
    0x21: "testbattery",
  },
  0x02: {
    0x11: "switch", 
    0x12: "enter_switch",
    0x13: "phonename", 
    0x14: "keylist",
    0x15: "disconnect_by_mac", 
    0x16: "connect_by_mac",
    0x17: "delete_by_mac", 
    0x18: "device_media_status",
  },
  0x03: {
    0x21: "keyfun", 
    0x22: "resetkeyfun",
    0x23: "tounch_tip", 
    0x24: "environment_switch",
    0x25: "tbd_switch", 
    0x26: "auto_poweroff",
    0x27: "ldac_switch", 
    0x29: "game_mode",
    0x2C: "Wear_detection",
  },
  0x04: {
    0x31: "read_eq_para", 
    0x32: "set_user_eq_para",
    0x33: "3d_effect_switch", 
    0x34: "zoom_effect_switch",
    0x35: "ldac_switch", 
    0x36: "search_headset",
    0x37: "lost_notice",
  },
  0x10: { 0x79: "set_app_enable" },
  0x11: { 0x11: "get_deviceinfo" },
  0x22: { 
    0x22: "tracker", 
    0xFF: "clear_tracker" 
  },
  0x23: {
    0x11: "report_song_title_lyrics", 0x21: "report_singer_name",
    0x31: "report_album_name", 0x32: "current_player_status",
    0x33: "total_duration_cur_song", 0x40: "play_pause",
    0x41: "previous_song", 0x42: "next_song",
  },
  0xA1: {
    0x81: "awake_switch", 0x82: "set_record",
    0x83: "set_languagnge", 0x84: "awake_notify",
    0x85: "record_data_upload", 0x86: "record_status_upload",
    0x87: "ios_set_vol", 0x90: "heart_parket",
  },
  0xFF: {
    0x01: "read_touch", 0x02: "read_imu",
    0x03: "touch_str_upload", 0x04: "imu_str_upload",
    0x05: "write_tap_algo_param", 0x06: "read_tap_algo_param",
    0x07: "capture_accel_data", 0xFF: "license",
  },
};

export function getAppCmdName(groupId: number, subId: number): string {
  const group = APP_CMD_MAP[groupId];
  if (!group) return `unknown_group(0x${groupId.toString(16).toUpperCase().padStart(2, '0')})`;
  return group[subId] || `group_0x${groupId.toString(16).toUpperCase().padStart(2, '0')}_unknown_sub(0x${subId.toString(16).toUpperCase().padStart(2, '0')})`;
}