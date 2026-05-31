import {
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { App } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import VirtualList from '@/components/VirtualList';
import type { VirtualListHandle } from '@/components/VirtualList';
import { escapeHtml } from '@/utils/format';
import type { LogEntry } from '@/types';

// 高亮颜色表
const HIGHLIGHT_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
  { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
  { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },
  { bg: '#ccfbf1', text: '#115e59', border: '#14b8a6' },
  { bg: '#f3e8ff', text: '#6b21a8', border: '#a855f7' },
];

const HIGHLIGHT_STYLE =
  'user-select:text;-webkit-user-select:text;display:inline;padding:0 2px;border-radius:2px;font-weight:600;';

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

interface ContextMenuState {
  x: number;
  y: number;
  log: LogEntry;
  lineNumber: number;
  selectedText: string;
}

interface SelectionActionState {
  x: number;
  y: number;
  text: string;
}

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

function highlightText(text: string, patterns: { regex: RegExp; colorIndex: number }[]): string {
  if (!patterns.length) return escapeHtml(text);

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
      const hasOverlap = matches.some(m => !(end <= m.start || start >= m.end));
      if (!hasOverlap) {
        matches.push({ start, end, colorIndex, text: matchText });
      }
    }
  });

  if (!matches.length) return escapeHtml(text);

  matches.sort((a, b) => a.start - b.start);

  let html = '';
  let lastEnd = 0;

  matches.forEach(({ start, end, colorIndex, text: matchText }) => {
    if (start > lastEnd) {
      html += escapeHtml(text.slice(lastEnd, start));
    }
    const color = HIGHLIGHT_COLORS[colorIndex];
    const escapedMatch = escapeHtml(matchText);
    html += `<span style="${HIGHLIGHT_STYLE}background:${color.bg};color:${color.text};border:1px solid ${color.border};">${escapedMatch}</span>`;
    lastEnd = end;
  });

  if (lastEnd < text.length) {
    html += escapeHtml(text.slice(lastEnd));
  }

  return html;
}

function isLogWordChar(char: string): boolean {
  return char.length > 0 && !/\s/.test(char);
}

function selectWordAtPoint(clientX: number, clientY: number) {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  let range: Range | null = null;
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY);
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }
  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;

  const textNode = range.startContainer;
  const text = textNode.textContent || '';
  let start = range.startOffset;
  let end = range.startOffset;

  while (start > 0 && isLogWordChar(text[start - 1])) start--;
  while (end < text.length && isLogWordChar(text[end])) end++;

  if (start >= end) return;

  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const DECODED_ROW_BG: Record<string, string> = {
  hci: 'bg-match-hci-bg hover:bg-match-hci-hover',
  iap2: 'bg-match-iap2-bg hover:bg-match-iap2-hover',
};
const DECODED_ROW_BG_DEFAULT = 'bg-match-decoded-bg hover:bg-match-decoded-hover';

const LogPanel = forwardRef<LogPanelHandle, LogPanelProps>(
  ({ allLogs, filteredIndices, selectedId, filterText, scrollTop, onScroll, onSelectRow }, ref) => {
    const listRef = useRef<VirtualListHandle>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    const { message } = App.useApp();

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [selectionAction, setSelectionAction] = useState<SelectionActionState | null>(null);

    const patterns = useMemo(() => parseFilterPatterns(filterText), [filterText]);
    const hasHighlight = patterns.length > 0;

    const copyText = useCallback(async (text: string, successMsg = '已复制到剪贴板') => {
      try {
        await navigator.clipboard.writeText(text);
        message.success(successMsg);
      } catch {
        message.error('复制失败');
      }
    }, [message]);

    useEffect(() => {
      const onSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setSelectionAction(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const panel = panelRef.current;
        if (!panel?.contains(range.commonAncestorContainer)) {
          setSelectionAction(null);
          return;
        }

        const text = selection.toString();
        if (!text) {
          setSelectionAction(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        setSelectionAction({
          x: rect.left + rect.width / 2,
          y: rect.top,
          text,
        });
      };

      document.addEventListener('selectionchange', onSelectionChange);
      return () => document.removeEventListener('selectionchange', onSelectionChange);
    }, []);

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

      const handlePointerDown = (e: React.PointerEvent) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
      };

      const handleRowClick = (e: React.MouseEvent) => {
        const selection = window.getSelection()?.toString();
        if (selection) return;

        const start = pointerStartRef.current;
        if (start) {
          const dx = Math.abs(e.clientX - start.x);
          const dy = Math.abs(e.clientY - start.y);
          if (dx > 4 || dy > 4) return;
        }
        onSelectRow(log.id, filteredIdx);
      };

      const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          log,
          lineNumber,
          selectedText: window.getSelection()?.toString() || '',
        });
      };

      const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        selectWordAtPoint(e.clientX, e.clientY);
      };

      return (
        <div
          className={`relative h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border-light cursor-text ${
            isSelected ? 'bg-selected' : decodedBg || 'bg-bg-panel hover:bg-gray-100'
          }`}
          onPointerDown={handlePointerDown}
          onClick={handleRowClick}
          onContextMenu={handleContextMenu}>
          <div className={`absolute left-0 top-0 bottom-0 w-[3px] pointer-events-none ${isSelected ? 'bg-accent-blue' : 'bg-transparent'}`} />
          <span className="w-9 flex-shrink-0 text-right pr-1 text-[11px] text-gray-400 border-r border-border-light select-none tabular-nums">
            {lineNumber}
          </span>
          {hasHighlight ? (
            <span
              className="font-mono text-text-dark pl-1 select-text"
              onDoubleClick={handleDoubleClick}
              dangerouslySetInnerHTML={{ __html: rawHtml }}
            />
          ) : (
            <span
              className="font-mono text-text-dark pl-1 select-text"
              onDoubleClick={handleDoubleClick}
            >
              {log.raw}
            </span>
          )}
        </div>
      );
    }, [allLogs, filteredIndices, selectedId, patterns, hasHighlight, onSelectRow]);

    return (
      <div ref={panelRef} className="relative flex flex-col h-full min-h-0 bg-bg-panel">
        <VirtualList ref={listRef} totalItems={filteredIndices.length} renderItem={renderRow}
          scrollTop={scrollTop} onScroll={onScroll} className="flex-1 select-text" />

        {selectionAction && (
          <button
            type="button"
            className="fixed z-[2001] flex items-center gap-1 px-2 py-1 text-xs rounded border border-border bg-bg-secondary text-text-primary shadow-lg hover:bg-bg-primary"
            style={{ left: selectionAction.x, top: selectionAction.y - 8, transform: 'translate(-50%, -100%)' }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              void copyText(selectionAction.text);
              setSelectionAction(null);
              window.getSelection()?.removeAllRanges();
            }}
          >
            <CopyOutlined />
            复制选中
          </button>
        )}

        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[1999]" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-[2000] min-w-[160px] py-1 rounded border border-border bg-bg-secondary shadow-lg text-sm text-text-primary"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.selectedText && (
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-bg-primary"
                  onClick={() => {
                    void copyText(contextMenu.selectedText);
                    setContextMenu(null);
                  }}
                >
                  复制选中内容
                </button>
              )}
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-bg-primary"
                onClick={() => {
                  void copyText(contextMenu.log.raw);
                  setContextMenu(null);
                }}
              >
                复制行内容
              </button>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left hover:bg-bg-primary"
                onClick={() => {
                  void copyText(`${contextMenu.lineNumber}\t${contextMenu.log.raw}`);
                  setContextMenu(null);
                }}
              >
                复制（含行号）
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
);

LogPanel.displayName = 'LogPanel';
export default LogPanel;
