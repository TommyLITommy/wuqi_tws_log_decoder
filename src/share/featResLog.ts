import { decodeFeatResUsr } from '@/share/featResUsrMap';
import type { DeviceStatusSnapshot, FeatResInfo } from '@/types';

export const FEAT_RES_RE =
  /\[feat_res\]\s+en:(\d+)\s+usr:(0x[0-9a-fA-F]+)\s+msk:(0x[0-9a-fA-F]+)\s+mod:(\d+)\s+exp:([\d/]+)\s+use:([\d/->]+)/i;

function parseHexBigInt(hex: string): bigint {
  return BigInt(hex);
}

export function extractFeatRes(raw: string): FeatResInfo | null {
  const match = FEAT_RES_RE.exec(raw);
  if (!match) return null;

  const en = parseInt(match[1], 10);
  const usr = parseHexBigInt(match[2]);
  const msk = parseHexBigInt(match[3]);
  const mod = parseInt(match[4], 10);
  const exp = match[5];
  const use = match[6];

  if ([en, mod].some(v => Number.isNaN(v))) return null;

  const activeModules = decodeFeatResUsr(usr);

  return {
    en,
    usr,
    msk,
    mod,
    exp,
    use,
    activeModules,
  };
}

export function featResEqual(a: FeatResInfo | null, b: FeatResInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.en === b.en
    && a.usr === b.usr
    && a.msk === b.msk
    && a.mod === b.mod
    && a.exp === b.exp
    && a.use === b.use;
}

export function applyFeatResLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const featRes = extractFeatRes(raw);
  if (!featRes) return;

  snapshot.featRes = featRes;
  snapshot.lastEvent = `feat_res usr=${featRes.usr.toString(16)} [${featRes.activeModules.join(', ')}]`;
}
