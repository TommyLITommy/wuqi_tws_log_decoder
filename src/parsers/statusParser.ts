import type { LogParser, ParseResult } from '@/types';

const STATUS_CODES: Record<number, { meaning: string; severity: ParseResult['severity']; description: string }> = {
  0x00: { meaning: '成功', severity: 'success', description: '操作成功完成' },
  0x01: { meaning: '失败', severity: 'error', description: '操作失败' },
  0x02: { meaning: '忙', severity: 'warning', description: '设备繁忙' },
  0x03: { meaning: '超时', severity: 'error', description: '操作超时' },
  0x04: { meaning: '无效参数', severity: 'error', description: '参数无效' },
  0x05: { meaning: '不支持', severity: 'warning', description: '不支持的操作' },
  0x06: { meaning: '未初始化', severity: 'warning', description: '设备未初始化' },
  0x07: { meaning: '无权限', severity: 'error', description: '无操作权限' },
  0x08: { meaning: '资源不足', severity: 'warning', description: '系统资源不足' },
  0x09: { meaning: '校验失败', severity: 'error', description: '数据校验失败' },
  0x0A: { meaning: '格式错误', severity: 'error', description: '数据格式错误' },
  0x0B: { meaning: '设备错误', severity: 'error', description: '设备硬件错误' },
  0x0C: { meaning: '通信错误', severity: 'error', description: '通信失败' },
  0x0D: { meaning: '内存错误', severity: 'error', description: '内存操作错误' },
  0x0E: { meaning: '配置错误', severity: 'error', description: '配置信息错误' },
  0x0F: { meaning: '版本不匹配', severity: 'warning', description: '版本不兼容' },
  0x10: { meaning: '数据丢失', severity: 'error', description: '数据丢失或损坏' },
  0xFF: { meaning: '未知错误', severity: 'error', description: '未知错误类型' },
};

export const statusParser: LogParser = {
  name: 'StatusCodeParser',
  pattern: /status:0x([0-9a-fA-F]{2})/,
  
  parse(match: RegExpMatchArray): ParseResult | null {
    const hexStr = match[1];
    const code = parseInt(hexStr, 16);
    const status = STATUS_CODES[code];
    
    if (!status) {
      return {
        badge: 'status',
        rawValue: `0x${hexStr.toUpperCase()}`,
        name: '未知状态码',
        desc: `未定义 (dec:${code})`,
        severity: 'warning',
      };
    }
    
    return {
      badge: 'status',
      rawValue: `0x${hexStr.toUpperCase()}`,
      name: status.meaning,
      desc: status.description,
      severity: status.severity,
    };
  }
};