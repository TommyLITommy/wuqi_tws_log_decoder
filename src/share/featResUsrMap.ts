/** WQ_FEAT_RES_USR_E — usr 字段每个 bit 对应的模块名 */
export const FEAT_RES_USR_BIT_MAP: Record<number, string> = {
  0x0001: 'WQ_FEAT_RES_USR_SCO',
  0x0002: 'WQ_FEAT_RES_USR_A2DP',
  0x0004: 'WQ_FEAT_RES_USR_TONE',
  0x0008: 'WQ_FEAT_RES_USR_RECORD',
  0x0010: 'WQ_FEAT_RES_USR_ANC',
  0x0020: 'WQ_FEAT_RES_USR_VAD',
  0x0040: 'WQ_FEAT_RES_USR_LOOPBACK',
  0x0080: 'WQ_FEAT_RES_USR_SPATIAL',
  0x0100: 'WQ_FEAT_RES_USR_LEA',
  0x0200: 'WQ_FEAT_RES_USR_LOCAL_MUSIC',
  0x0400: 'WQ_FEAT_RES_USR_ADEQ',
  0x0800: 'WQ_FEAT_RES_USR_VBASS',
  0x1000: 'WQ_FEAT_RES_USR_DRC',
  0x2000: 'WQ_FEAT_RES_USR_EQ',
  0x4000: 'WQ_FEAT_RES_USR_KWS',
  0x8000: 'WQ_FEAT_RES_USR_ENC',
  0x10000: 'WQ_FEAT_RES_USR_DEC',
  0x20000: 'WQ_FEAT_RES_USR_LC3',
  0x40000: 'WQ_FEAT_RES_USR_AAC',
  0x80000: 'WQ_FEAT_RES_USR_SBC',
  0x100000: 'WQ_FEAT_RES_USR_LDAC',
  0x200000: 'WQ_FEAT_RES_USR_LHDC',
  0x400000: 'WQ_FEAT_RES_USR_GAMING',
  0x800000: 'WQ_FEAT_RES_USR_USB',
};

export function decodeFeatResUsr(usr: bigint): string[] {
  if (usr === 0n) return ['none'];

  const modules: string[] = [];
  const knownBits = Object.keys(FEAT_RES_USR_BIT_MAP).map(Number).sort((a, b) => a - b);

  for (const bitValue of knownBits) {
    if (usr & BigInt(bitValue)) {
      modules.push(FEAT_RES_USR_BIT_MAP[bitValue]);
    }
  }

  let remaining = usr;
  for (const bitValue of knownBits) {
    remaining &= ~BigInt(bitValue);
  }
  if (remaining !== 0n) {
    for (let bit = 0; bit < 64; bit++) {
      const mask = 1n << BigInt(bit);
      if (remaining & mask) {
        modules.push(`WQ_FEAT_RES_USR_BIT${bit}`);
      }
    }
  }

  return modules;
}

export function formatFeatResModuleName(name: string): string {
  return name.replace(/^WQ_FEAT_RES_USR_/, '');
}

export function formatFeatResModules(modules: string[]): string {
  if (modules.length === 0 || (modules.length === 1 && modules[0] === 'none')) return '无';
  return modules.map(formatFeatResModuleName).join(', ');
}
