export interface DecodedResult {
  badge: 'hci' | 'iap2' | 'rpc' | 'status' | 'appcmd' | 'btn' | 'appmsg' | 'state';
  rawValue: string;
  hexValue: string;
  name: string;
  desc: string;
  matchText: string;
}

export interface LogEntry {
  id: number;
  raw: string;
  decoded: DecodedResult | null;
}

export interface DecodeTableEntry {
  name: string;
  desc: string;
  badge: 'hci' | 'iap2';
}

export interface ThumbMatch {
  line: number;
  decoded: DecodedResult;
}

export interface PanelSizes {
  leftWidth: number;
  thumbWidth: number;
}

export interface ParseResult {
    badge: string;
    rawValue: string;
    name: string;
    desc: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
}

export interface LogParser {
    name: string;
    pattern: RegExp;
    parse(match: RegExpMatchArray, line: string): ParseResult | null;
}