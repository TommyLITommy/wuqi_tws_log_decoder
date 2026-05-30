export const WQ_RET: Record<number, string> = {
  0: "WQ_RET_OK",
  1: "WQ_RET_INVAL",
  2: "WQ_RET_NOMEM",
  3: "WQ_RET_NOSUPP",
  4: "WQ_RET_NOSEC_WL",
  5: "WQ_RET_NOT_EXIST",
  6: "WQ_RET_AGAIN",
  7: "WQ_RET_NOT_READY",
  8: "WQ_RET_EXIST",
  9: "WQ_RET_BUSY",
  10: "WQ_RET_PENDING",
  11: "WQ_RET_FAIL",
  12: "WQ_RET_NOSEC_BL",
  13: "WQ_RET_CRC_LEN",
  14: "WQ_RET_DISCONNECT",
  15: "WQ_RET_TIMEOVER",
  16: "WQ_RET_CRC_FAIL"
};

export function getWqRetName(index: number): string {
  return WQ_RET[index] || `UNKNOWN(${index})`;
}