export const HCI_ERROR_CODE: Record<number, string> = {
  0x00: "HCI_ERR_SUCCESS",
  0x01: "HCI_ERR_UNKNOWN_CMD",
  0x02: "HCI_ERR_UNKNOWN_CONN_ID",
  0x03: "HCI_ERR_HW_FAILURE",
  0x04: "HCI_ERR_PAGE_TIMEOUT",
  0x05: "HCI_ERR_AUTHENTICATION_FAIL",
  0x06: "HCI_ERR_PIN_OR_KEY_MISSING",
  0x07: "HCI_ERR_MEM_CAPACITY_EXCEEDED",
  0x08: "HCI_ERR_CONN_TIMEOUT",
  0x09: "HCI_ERR_CONN_LIMIT_EXCEEDED",
  0x0A: "HCI_ERR_SYNC_CONN_LIMIT_EXCEEDED",
  0x0B: "HCI_ERR_CONN_ALREADY_EXISTS",
  0x0C: "HCI_ERR_CMD_DISALLOWED",
  0x0D: "HCI_ERR_INSUFFICIENT_RESOURCES",
  0x0E: "HCI_ERR_INSUFFICIENT_SECURITY",
  0x0F: "HCI_ERR_BD_ADDR_UNACCEPTABLE",
  0x10: "HCI_ERR_CONN_ACCEPT_TIMEOUT",
  0x11: "HCI_ERR_UNSUPP_FEATURE_PARAM_VAL",
  0x12: "HCI_ERR_INVALID_PARAM",
  0x13: "HCI_ERR_REMOTE_USER_TERM_CONN",
  0x14: "HCI_ERR_REMOTE_LOW_RESOURCES",
  0x15: "HCI_ERR_REMOTE_POWER_OFF",
  0x16: "HCI_ERR_LOCALHOST_TERM_CONN",
  0x18: "HCI_ERR_PAIRING_NOT_ALLOWED",
  0x1A: "HCI_ERR_UNSUPP_REMOTE_FEATURE",
  0x1B: "HCI_ERR_SCO_OFFSET_REJECTED",
  0x1C: "HCI_ERR_SCO_INTERVAL_REJECTED",
  0x1D: "HCI_ERR_SCO_AIR_MODE_REJECTED",
  0x1E: "HCI_ERR_INVALID_LL_PARAM",
  0x1F: "HCI_ERR_UNSPECIFIED",
  0x20: "HCI_ERR_UNSUPP_LL_PARAM_VAL",
  0x22: "HCI_ERR_LL_RESP_TIMEOUT",
  0x23: "HCI_ERR_LL_PROC_COLLISION",
  0x28: "HCI_ERR_INSTANT_PASSED",
  0x29: "HCI_ERR_PAIRING_NOT_SUPPORTED",
  0x2A: "HCI_ERR_DIFF_TRANS_COLLISION",
  0x3B: "HCI_ERR_UNACCEPT_CONN_PARAM",
  0x3C: "HCI_ERR_ADV_TIMEOUT",
  0x3D: "HCI_ERR_TERM_DUE_TO_MIC_FAIL",
  0x3E: "HCI_ERR_CONN_FAIL_TO_ESTAB",
};

export const HCI_OPCODE_TO_CMD: Record<number, string> = {
  // Link Control (OGF=0x01)
  0x0401: "HCI_Inquiry",
  0x0402: "HCI_Inquiry_Cancel",
  0x0405: "HCI_Create_Connection",
  0x0406: "HCI_Disconnect",
  0x0409: "HCI_Accept_Connection_Request",
  0x040A: "HCI_Reject_Connection_Request",
  0x0411: "HCI_Authentication_Requested",
  0x0419: "HCI_Remote_Name_Request",
  0x0428: "HCI_Setup_Synchronous_Connection",
  // Controller & Baseband (OGF=0x03)
  0x0C01: "HCI_Set_Event_Mask",
  0x0C03: "HCI_Reset",
  0x0C12: "HCI_Write_Scan_Enable",
  0x0C1A: "HCI_Write_Class_of_Device",
  // Informational (OGF=0x04)
  0x1001: "HCI_Read_Local_Version_Information",
  0x1005: "HCI_Read_Buffer_Size",
  0x1007: "HCI_Read_BD_ADDR",
  // Status (OGF=0x05)
  0x1405: "HCI_Read_RSSI",
  // LE Controller (OGF=0x08)
  0x2001: "HCI_LE_Set_Event_Mask",
  0x2002: "HCI_LE_Read_Buffer_Size",
  0x2006: "HCI_LE_Set_Advertising_Parameters",
  0x2008: "HCI_LE_Set_Advertising_Data",
  0x200A: "HCI_LE_Set_Advertising_Enable",
  0x200D: "HCI_LE_Create_Connection",
  0x2037: "HCI_LE_Set_Extended_Advertising_Data",
};

export function getHciCmdStringByOpcode(opcode: number | string): string {
  if (typeof opcode === 'string') {
    opcode = parseInt(opcode, 16);
  }
  return HCI_OPCODE_TO_CMD[opcode] || `Unknown HCI Command (0x${opcode.toString(16).toUpperCase().padStart(4, '0')})`;
}

export function getHciErrorString(status: number | string): string {
  if (typeof status === 'string') {
    status = parseInt(status, 16);
  }
  if (status < 0 || status > 0xFF) {
    return `Out of range status: 0x${status.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return HCI_ERROR_CODE[status] || `Unknown HCI Error (0x${status.toString(16).toUpperCase().padStart(2, '0')})`;
}