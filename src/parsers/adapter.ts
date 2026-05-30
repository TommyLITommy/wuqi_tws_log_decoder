import type { ParseResult } from '@/types';
import type { DecodedResult } from '@/types';

/**
 * 将 Parser 的 ParseResult 转换为项目现有的 DecodedResult
 */
export function toDecodedResult(parseResult: ParseResult, matchText: string): DecodedResult {
  return {
    badge: parseResult.badge as DecodedResult['badge'],
    rawValue: parseResult.rawValue,
    hexValue: extractHexValue(parseResult.rawValue),
    name: parseResult.name,
    desc: parseResult.desc,
    matchText: matchText,
  };
}

/**
 * 从 rawValue 中提取十六进制值
 */
function extractHexValue(rawValue: string): string {
  // 匹配 0xXXXX 或 0xXX 格式
  const hexMatch = rawValue.match(/0x[0-9A-Fa-f]+/);
  return hexMatch ? hexMatch[0] : rawValue;
}