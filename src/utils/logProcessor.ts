import { parseLogLine } from '@/parsers/registry';
import { toDecodedResult } from '@/parsers/adapter';
import type { LogEntry, DecodedResult } from '@/types';

export function processLogFile(rawText: string): LogEntry[] {
  const lines = rawText.split('\n').filter(line => line.trim());
  
  return lines.map((text, idx) => {
    const parsed = parseLogLine(text);
    
    let decoded: DecodedResult | null = null;
    if (parsed) {
      decoded = toDecodedResult(parsed, text.trim());
    }
    
    return {
      id: idx + 1,
      raw: text.trim(),
      decoded,
    };
  });
}

export function getDecodedIndices(logs: LogEntry[]): number[] {
  return logs
    .map((log, idx) => ({ hasDecoded: !!log.decoded, idx }))
    .filter(({ hasDecoded }) => hasDecoded)
    .map(({ idx }) => idx);
}