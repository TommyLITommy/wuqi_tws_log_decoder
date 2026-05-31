const A2DP_VOLUME_PATTERNS = [
  /(?:MUSIC|A2DP|music|a2dp)[_\s-]*(?:VOLUME|vol(?:ume)?)[\s:=]+(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /EVTSYS_MUSIC_VOLUME_CHANGED[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /music\s+volume\s+(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /a2dp\s+vol(?:ume)?\s*[=:]\s*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /APP_AUDIO_MSG_ID_MUSIC_VOLUME_CHANGE[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /SYNC_MUSIC_VOLUME[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /AVRCP(?:[_\s]+REPORT)?[_\s]+VOLUME[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
];

const HFP_VOLUME_PATTERNS = [
  /(?:CALL|HFP|SCO|call|hfp|sco)[_\s-]*(?:VOLUME|vol(?:ume)?)[\s:=]+(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /EVTSYS_CALL_VOLUME_CHANGED[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /call\s+volume\s+(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /hfp\s+vol(?:ume)?\s*[=:]\s*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /APP_AUDIO_MSG_ID_CALL_VOLUME_CHANGE[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /SYNC_CALL_VOLUME[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
  /HFP(?:[_\s]+REPORT)?[_\s]+VOLUME[^\d]*(?:0x)?([0-9A-Fa-f]{1,3}|\d{1,3})/i,
];

function parseVolumeFromMatch(match: RegExpExecArray): number | null {
  const hexInMatch = match[0].match(/0x([0-9A-Fa-f]{1,3})/i);
  const value = hexInMatch
    ? parseInt(hexInMatch[1], 16)
    : parseInt(match[1], 10);
  if (Number.isNaN(value) || value < 0 || value > 255) return null;
  return value;
}

function extractVolume(raw: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(raw);
    if (match) {
      const value = parseVolumeFromMatch(match);
      if (value !== null) return value;
    }
  }
  return null;
}

export interface VolumeUpdate {
  a2dpVolume?: number;
  hfpVolume?: number;
}

export function extractVolumeUpdate(raw: string): VolumeUpdate {
  const update: VolumeUpdate = {};
  const a2dpVolume = extractVolume(raw, A2DP_VOLUME_PATTERNS);
  const hfpVolume = extractVolume(raw, HFP_VOLUME_PATTERNS);
  if (a2dpVolume !== null) update.a2dpVolume = a2dpVolume;
  if (hfpVolume !== null) update.hfpVolume = hfpVolume;
  return update;
}

export function applyVolumeLog(snapshot: { a2dpVolume: number | null; hfpVolume: number | null; lastEvent: string }, raw: string) {
  const update = extractVolumeUpdate(raw);
  if (update.a2dpVolume !== undefined) {
    snapshot.a2dpVolume = update.a2dpVolume;
    snapshot.lastEvent = `A2DP volume=${update.a2dpVolume}`;
  }
  if (update.hfpVolume !== undefined) {
    snapshot.hfpVolume = update.hfpVolume;
    snapshot.lastEvent = `HFP volume=${update.hfpVolume}`;
  }
}
