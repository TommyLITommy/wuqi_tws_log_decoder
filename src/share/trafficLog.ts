import type { DeviceStatusSnapshot, TrafficInfo } from '@/types';

export const TRAFFIC_RE =
  /traffic\s*=\s*([\d.]+)\s*kb\/s\s+le\s*=\s*(\d+)\/(\d+)\s+sco\s*=\s*(\d+)\/(\d+)\s+pkt_len\((\d+)\)\s*bytes\s+jitter\s+(\d+)\s+sample\s+md\s+(\d+)/i;

export function extractTraffic(raw: string): TrafficInfo | null {
  const match = TRAFFIC_RE.exec(raw);
  if (!match) return null;

  const trafficKbps = parseFloat(match[1]);
  const leCurrent = parseInt(match[2], 10);
  const leTotal = parseInt(match[3], 10);
  const scoCurrent = parseInt(match[4], 10);
  const scoTotal = parseInt(match[5], 10);
  const pktLen = parseInt(match[6], 10);
  const jitter = parseInt(match[7], 10);
  const sampleMd = parseInt(match[8], 10);

  if ([trafficKbps, leCurrent, leTotal, scoCurrent, scoTotal, pktLen, jitter, sampleMd]
    .some(v => Number.isNaN(v) || v < 0)) {
    return null;
  }

  return {
    trafficKbps,
    leCurrent,
    leTotal,
    scoCurrent,
    scoTotal,
    pktLen,
    jitter,
    sampleMd,
  };
}

export function trafficEqual(a: TrafficInfo | null, b: TrafficInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.trafficKbps === b.trafficKbps
    && a.leCurrent === b.leCurrent
    && a.leTotal === b.leTotal
    && a.scoCurrent === b.scoCurrent
    && a.scoTotal === b.scoTotal
    && a.pktLen === b.pktLen
    && a.jitter === b.jitter
    && a.sampleMd === b.sampleMd;
}

export function applyTrafficLog(snapshot: DeviceStatusSnapshot, raw: string) {
  const traffic = extractTraffic(raw);
  if (!traffic) return;

  snapshot.traffic = traffic;
  snapshot.lastEvent = `traffic=${traffic.trafficKbps}kb/s sco=${traffic.scoCurrent}/${traffic.scoTotal}`;
}
