import type { LogParser, ParseResult } from '@/types';
import { extractTraffic, TRAFFIC_RE } from '@/share/trafficLog';

export const trafficParser: LogParser = {
  name: 'TrafficParser',
  pattern: TRAFFIC_RE,

  parse(_match: RegExpMatchArray, line: string): ParseResult | null {
    const traffic = extractTraffic(line);
    if (!traffic) return null;

    return {
      badge: 'status',
      rawValue: `${traffic.trafficKbps}kb/s`,
      name: 'TRAFFIC',
      desc: `traffic=${traffic.trafficKbps}kb/s le=${traffic.leCurrent}/${traffic.leTotal} sco=${traffic.scoCurrent}/${traffic.scoTotal} pkt_len=${traffic.pktLen} jitter=${traffic.jitter} sample_md=${traffic.sampleMd}`,
      severity: traffic.scoCurrent > 0 ? 'success' : traffic.jitter >= 10000 ? 'warning' : 'info',
    };
  },
};
