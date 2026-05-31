/** [CM:0, 0x0042]CM_connected / CM_disconnected */
export const CM_CONNECTED_RE = /\[CM:(\d+),\s*0x[0-9A-Fa-f]{4}\]CM_connected/i;
export const CM_DISCONNECTED_RE = /\[CM:(\d+),\s*0x[0-9A-Fa-f]{4}\]CM_disconnected/i;

/** 一拖二 / multipoint 开关 */
export const MULTIPOINT_ON_RE =
  /(?:multipoint|MULTI[_\s]?CONNECT|multi_connect|一拖二|双手机)[\s:=-]*?(?:mode[\s:=-]*)?(?:on|enable|enabled|open|opened|开|1)\b/i;
export const MULTIPOINT_OFF_RE =
  /(?:multipoint|MULTI[_\s]?CONNECT|multi_connect|一拖二|双手机)[\s:=-]*?(?:mode[\s:=-]*)?(?:off|disable|disabled|close|closed|关|0)\b/i;

/** primary 手机 index */
export const MULTIPOINT_PRIMARY_RE =
  /(?:SET_MULTIPOINT_PRIMARY|multipoint_primary|primary_phone|set\s+primary)[\s:=-]+(\d+)/i;
