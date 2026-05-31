import type { LogParser, ParseResult } from '@/types';
import { formatFeatResModules } from '@/share/featResUsrMap';
import { extractFeatRes, FEAT_RES_RE } from '@/share/featResLog';

export const featResParser: LogParser = {
  name: 'FeatResParser',
  pattern: FEAT_RES_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const featRes = extractFeatRes(line);
    if (!featRes) return null;

    const modules = formatFeatResModules(featRes.activeModules);

    return {
      badge: 'status',
      rawValue: `0x${featRes.usr.toString(16).toUpperCase()}`,
      name: 'FEAT_RES',
      desc: `en:${featRes.en} usr:${modules} msk:0x${featRes.msk.toString(16)} mod:${featRes.mod} exp:${featRes.exp} use:${featRes.use}`,
      severity: featRes.activeModules[0] === 'none' ? 'info' : 'success',
    };
  },
};
