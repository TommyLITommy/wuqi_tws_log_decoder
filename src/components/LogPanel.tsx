import { useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import VirtualList from '@/components/VirtualList';
import type { VirtualListHandle } from '@/components/VirtualList';
import { escapeHtml } from '@/utils/format';
import type { LogEntry } from '@/types';

// 高亮颜色表
const HIGHLIGHT_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },  // 蓝色
  { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },  // 黄色
  { bg: '#d1fae5', text: '#065f46', border: '#10b981' },  // 绿色
  { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },  // 粉色
  { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },  // 紫色
  { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },  // 橙色
  { bg: '#ccfbf1', text: '#115e59', border: '#14b8a6' },  // 青色
  { bg: '#f3e8ff', text: '#6b21a8', border: '#a855f7' },  // 紫罗兰
];

export interface LogPanelHandle {
  scrollTo: (scrollTop: number) => void;
  getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
}

interface LogPanelProps {
  allLogs: LogEntry[];
  filteredIndices: number[];
  selectedId: number | null;
  filterText: string;
  scrollTop?: number;
  onScroll?: (scrollTop: number) => void;
  onSelectRow: (id: number, idx: number) => void;
}

// 解析过滤文本中的正则表达式（按 | 分割）
function parseFilterPatterns(filterText: string): { regex: RegExp; colorIndex: number }[] {
  if (!filterText) return [];

  const patterns: { regex: RegExp; colorIndex: number }[] = [];
  const parts = filterText.split('|');

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    try {
      let regex: RegExp;
      if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
        const lastSlash = trimmed.lastIndexOf('/');
        const pattern = trimmed.slice(1, lastSlash);
        const flags = trimmed.slice(lastSlash + 1);
        regex = new RegExp(pattern, flags || 'gi');
      } else {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(`(${escaped})`, 'gi');
      }
      patterns.push({ regex, colorIndex: index % HIGHLIGHT_COLORS.length });
    } catch {
      // 忽略无效正则
    }
  });

  return patterns;
}

// 高亮文本 - 在原始文本上构建 HTML，避免位置偏移
function highlightText(text: string, patterns: { regex: RegExp; colorIndex: number }[]): string {
  if (!patterns.length) return escapeHtml(text);

  // 收集所有匹配位置（基于原始文本）
  const matches: { start: number; end: number; colorIndex: number; text: string }[] = [];

  patterns.forEach(({ regex, colorIndex }) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
        continue;
      }
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;

      // 检查是否与已有重叠
      const hasOverlap = matches.some(m => !(end <= m.start || start >= m.end));
      if (!hasOverlap) {
        matches.push({ start, end, colorIndex, text: matchText });
      }
    }
  });

  if (!matches.length) return escapeHtml(text);

  // 按位置排序
  matches.sort((a, b) => a.start - b.start);

  // 构建 HTML：分段处理，匹配部分高亮，非匹配部分转义
  let html = '';
  let lastEnd = 0;

  matches.forEach(({ start, end, colorIndex, text: matchText }) => {
    // 添加匹配前的普通文本（转义）
    if (start > lastEnd) {
      html += escapeHtml(text.slice(lastEnd, start));
    }
    // 添加高亮匹配文本（转义后包裹）
    const color = HIGHLIGHT_COLORS[colorIndex];
    const escapedMatch = escapeHtml(matchText);
    html += `<span style="background:${color.bg};color:${color.text};border:1px solid ${color.border};padding:0 2px;border-radius:2px;font-weight:600;">${escapedMatch}</span>`;
    lastEnd = end;
  });

  // 添加最后一段普通文本
  if (lastEnd < text.length) {
    html += escapeHtml(text.slice(lastEnd));
  }

  return html;
}

const DECODED_ROW_BG: Record<string, string> = {
  hci: 'bg-match-hci-bg hover:bg-match-hci-hover',
  iap2: 'bg-match-iap2-bg hover:bg-match-iap2-hover',
};
const DECODED_ROW_BG_DEFAULT = 'bg-match-decoded-bg hover:bg-match-decoded-hover';

const LogPanel = forwardRef<LogPanelHandle, LogPanelProps>(
  ({ allLogs, filteredIndices, selectedId, filterText, scrollTop, onScroll, onSelectRow }, ref) => {
    const listRef = useRef<VirtualListHandle>(null);

    const patterns = useMemo(() => parseFilterPatterns(filterText), [filterText]);

    useImperativeHandle(ref, () => ({
      scrollTo: (top: number) => listRef.current?.scrollTo(top),
      getScrollInfo: () => listRef.current?.getScrollInfo() || { scrollTop: 0, scrollHeight: 1, clientHeight: 1 },
    }));

    const renderRow = useMemo(() => (filteredIdx: number) => {
      const logIdx = filteredIndices[filteredIdx];
      const log = allLogs[logIdx];
      if (!log) return null;

      const isSelected = selectedId === log.id;
      const rawHtml = highlightText(log.raw, patterns);
      const decodedBg = log.decoded
        ? (DECODED_ROW_BG[log.decoded.badge] ?? DECODED_ROW_BG_DEFAULT)
        : '';
      const lineNumber = logIdx + 1;

      return (
        <div
          className={`relative h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border-light cursor-pointer ${
            isSelected ? 'bg-selected' : decodedBg || 'bg-bg-panel hover:bg-gray-100'
          }`}
          onClick={() => onSelectRow(log.id, filteredIdx)}>
          <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isSelected ? 'bg-accent-blue' : 'bg-transparent'}`} />
          <span className="w-9 flex-shrink-0 text-right pr-1 text-[11px] text-gray-400 border-r border-border-light select-none tabular-nums">
            {lineNumber}
          </span>
          <span className="font-mono text-text-dark pl-1" dangerouslySetInnerHTML={{ __html: rawHtml }} />
        </div>
      );
    }, [allLogs, filteredIndices, selectedId, patterns, onSelectRow]);

    return (
      <div className="flex flex-col h-full min-h-0 bg-bg-panel">
        <VirtualList ref={listRef} totalItems={filteredIndices.length} renderItem={renderRow}
          scrollTop={scrollTop} onScroll={onScroll} className="flex-1" />
      </div>
    );
  }
);

LogPanel.displayName = 'LogPanel';
export default LogPanel;