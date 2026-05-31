import type { LogParser, ParseResult } from '@/types';
import { extractWwsRoleChanged, WWS_ROLE_CHANGED_RE } from '@/share/wwsRoleChangedLog';

function severityForRoleChange(reason: number): ParseResult['severity'] {
  if (reason === 3 || reason === 1 || reason === 4) return 'warning';
  if (reason === 6 || reason === 7) return 'info';
  if (reason === 2) return 'warning';
  return 'info';
}

export const wwsRoleChangedParser: LogParser = {
  name: 'WwsRoleChangedParser',
  pattern: WWS_ROLE_CHANGED_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const info = extractWwsRoleChanged(line);
    if (!info) return null;

    return {
      badge: 'status',
      rawValue: `${info.fromRole}=>${info.toRole}`,
      name: 'WWS_ROLE_CHANGED',
      desc: `${info.fromRoleName} => ${info.toRoleName} reason:${info.reasonName}`,
      severity: severityForRoleChange(info.reason),
    };
  },
};
