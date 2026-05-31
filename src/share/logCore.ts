export type LogCore = 'A' | 'B' | 'D';

export function getLogCoreType(raw: string): LogCore | null {
  const match = raw.match(/\[(A|B|D)-/i);
  return match ? (match[1].toUpperCase() as LogCore) : null;
}
