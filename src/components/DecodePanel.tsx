// // import { useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
// // import VirtualList from '@/components/VirtualList';
// // import type { VirtualListHandle } from '@/components/VirtualList';
// // import { Tag } from 'antd';
// // import type { LogEntry } from '@/types';

// // export interface DecodePanelHandle {
// //   scrollTo: (scrollTop: number) => void;
// //   getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
// // }

// // interface DecodePanelProps {
// //   allLogs: LogEntry[];
// //   filteredIndices: number[];
// //   selectedId: number | null;
// //   scrollTop?: number;
// //   onScroll?: (scrollTop: number) => void;
// //   onSelectRow: (id: number, idx: number) => void;
// // }

// // const DecodePanel = forwardRef<DecodePanelHandle, DecodePanelProps>(
// //   ({ allLogs, filteredIndices, selectedId, scrollTop, onScroll, onSelectRow }, ref) => {
// //     const listRef = useRef<VirtualListHandle>(null);

// //     useImperativeHandle(ref, () => ({
// //       scrollTo: (top: number) => listRef.current?.scrollTo(top),
// //       getScrollInfo: () => listRef.current?.getScrollInfo() || { scrollTop: 0, scrollHeight: 1, clientHeight: 1 },
// //     }));

// //     const renderRow = useMemo(() => (filteredIdx: number) => {
// //       const logIdx = filteredIndices[filteredIdx];
// //       const log = allLogs[logIdx];
// //       if (!log) return null;

// //       const isSelected = selectedId === log.id;
// //       const decoded = log.decoded;

// //       if (!decoded) {
// //         return (
// //           <div className={`h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border cursor-pointer hover:bg-bg-secondary ${isSelected ? 'bg-selected-dark' : ''}`}
// //             onClick={() => onSelectRow(log.id, filteredIdx)}>
// //             {/* 左边框指示器 */}
// //             <div className={`w-[3px] h-full flex-shrink-0 mr-2 ${isSelected ? 'bg-accent-yellow' : 'bg-transparent'}`} />
// //             <span className="text-border">-</span>
// //           </div>
// //         );
// //       }

// //       return (
// //         <div className={`h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border cursor-pointer gap-2 hover:bg-bg-secondary ${isSelected ? 'bg-selected-dark' : ''}`}
// //           onClick={() => onSelectRow(log.id, filteredIdx)}>
// //           {/* 左边框指示器 */}
// //           <div className={`w-[3px] h-full flex-shrink-0 mr-2 ${isSelected ? 'bg-accent-yellow' : 'bg-transparent'}`} />
// //           <Tag color={decoded.badge === 'iap2' ? 'warning' : 'blue'} className="text-[10px] m-0 leading-none">
// //             {decoded.badge.toUpperCase()}
// //           </Tag>
// //           <span className="text-accent-yellow text-[11px]">{decoded.rawValue}</span>
// //           <span className="text-accent-green font-medium text-xs">{decoded.name}</span>
// //           <span className="text-text-secondary text-[11px]">{decoded.desc}</span>
// //         </div>
// //       );
// //     }, [allLogs, filteredIndices, selectedId, onSelectRow]);

// //     return (
// //       <div className="flex flex-col h-full bg-bg-primary">
// //         <VirtualList ref={listRef} totalItems={filteredIndices.length} renderItem={renderRow}
// //           scrollTop={scrollTop} onScroll={onScroll} className="flex-1" />
// //       </div>
// //     );
// //   }
// // );

// // DecodePanel.displayName = 'DecodePanel';
// // export default DecodePanel;

// import { useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
// import VirtualList from '@/components/VirtualList';
// import type { VirtualListHandle } from '@/components/VirtualList';
// import { Tag } from 'antd';
// import type { LogEntry } from '@/types';

// export interface DecodePanelHandle {
//   scrollTo: (scrollTop: number) => void;
//   getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
// }

// interface DecodePanelProps {
//   allLogs: LogEntry[];
//   filteredIndices: number[];
//   selectedId: number | null;
//   scrollTop?: number;
//   onScroll?: (scrollTop: number) => void;
//   onSelectRow: (id: number, idx: number) => void;
// }

// // severity 到 Tag 颜色的映射
// const BADGE_COLORS: Record<string, string> = {
//   rpc: 'blue',
//   hci: 'purple',
//   status: 'cyan',
//   appcmd: 'orange',
//   btn: 'lime',
//   appmsg: 'geekblue',
//   state: 'gold',
//   iap2: 'warning',
// };

// const SEVERITY_COLORS: Record<string, string> = {
//   info: 'blue',
//   success: 'green',
//   warning: 'orange',
//   error: 'red',
// };

// const DecodePanel = forwardRef<DecodePanelHandle, DecodePanelProps>(
//   ({ allLogs, filteredIndices, selectedId, scrollTop, onScroll, onSelectRow }, ref) => {
//     const listRef = useRef<VirtualListHandle>(null);

//     useImperativeHandle(ref, () => ({
//       scrollTo: (top: number) => listRef.current?.scrollTo(top),
//       getScrollInfo: () => listRef.current?.getScrollInfo() || { scrollTop: 0, scrollHeight: 1, clientHeight: 1 },
//     }));

//     const renderRow = useMemo(() => (filteredIdx: number) => {
//       const logIdx = filteredIndices[filteredIdx];
//       const log = allLogs[logIdx];
//       if (!log) return null;

//       const isSelected = selectedId === log.id;
//       const decoded = log.decoded;

//       if (!decoded) {
//         return (
//           <div className={`h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border cursor-pointer hover:bg-bg-secondary ${isSelected ? 'bg-selected-dark' : ''}`}
//             onClick={() => onSelectRow(log.id, filteredIdx)}>
//             <div className={`w-[3px] h-full flex-shrink-0 mr-2 ${isSelected ? 'bg-accent-yellow' : 'bg-transparent'}`} />
//             <span className="text-border">-</span>
//           </div>
//         );
//       }

//       // 统一使用 ParseResult 格式
//       const badge = decoded.badge || 'unknown';
//       const rawValue = decoded.rawValue || '';
//       const name = decoded.name || '';
//       const desc = decoded.desc || '';
//       const severity = decoded.severity || 'info';
      
//       const tagColor = BADGE_COLORS[badge] || SEVERITY_COLORS[severity] || 'default';

//       return (
//         <div className={`h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border cursor-pointer gap-2 hover:bg-bg-secondary ${isSelected ? 'bg-selected-dark' : ''}`}
//           onClick={() => onSelectRow(log.id, filteredIdx)}
//           title={`${name} | ${desc}`}>
          
//           <div className={`w-[3px] h-full flex-shrink-0 mr-2 ${isSelected ? 'bg-accent-yellow' : 'bg-transparent'}`} />
          
//           <Tag color={tagColor} className="text-[10px] m-0 leading-none uppercase font-mono">
//             {badge}
//           </Tag>
          
//           <span className="text-accent-yellow text-[11px] font-mono">{rawValue}</span>
          
//           <span className={`font-medium text-xs truncate max-w-[200px] ${severity === 'error' ? 'text-red-400' : 'text-accent-green'}`}>
//             {name}
//           </span>
          
//           <span className="text-text-secondary text-[11px] truncate max-w-[250px]">{desc}</span>
//         </div>
//       );
//     }, [allLogs, filteredIndices, selectedId, onSelectRow]);

//     return (
//       <div className="flex flex-col h-full bg-bg-primary">
//         <VirtualList ref={listRef} totalItems={filteredIndices.length} renderItem={renderRow}
//           scrollTop={scrollTop} onScroll={onScroll} className="flex-1" />
//       </div>
//     );
//   }
// );

// DecodePanel.displayName = 'DecodePanel';
// export default DecodePanel;

import { useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import VirtualList from '@/components/VirtualList';
import type { VirtualListHandle } from '@/components/VirtualList';
import { Tag } from 'antd';
import type { LogEntry } from '@/types';

export interface DecodePanelHandle {
  scrollTo: (scrollTop: number) => void;
  getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
}

interface DecodePanelProps {
  allLogs: LogEntry[];
  filteredIndices: number[];
  selectedId: number | null;
  scrollTop?: number;
  onScroll?: (scrollTop: number) => void;
  onSelectRow: (id: number, idx: number) => void;
}

// badge 到 Tag 颜色的映射（扩展所有 Parser 类型）
const BADGE_COLORS: Record<string, string> = {
  hci: 'purple',
  iap2: 'warning',
  rpc: 'blue',
  status: 'cyan',
  appcmd: 'orange',
  btn: 'lime',
  appmsg: 'geekblue',
  state: 'gold',
  a2dp: 'green',
  profile: 'volcano',
};

const DecodePanel = forwardRef<DecodePanelHandle, DecodePanelProps>(
  ({ allLogs, filteredIndices, selectedId, scrollTop, onScroll, onSelectRow }, ref) => {
    const listRef = useRef<VirtualListHandle>(null);

    useImperativeHandle(ref, () => ({
      scrollTo: (top: number) => listRef.current?.scrollTo(top),
      getScrollInfo: () => listRef.current?.getScrollInfo() || { scrollTop: 0, scrollHeight: 1, clientHeight: 1 },
    }));

    const renderRow = useMemo(() => (filteredIdx: number) => {
      const logIdx = filteredIndices[filteredIdx];
      const log = allLogs[logIdx];
      if (!log) return null;

      const isSelected = selectedId === log.id;
      const decoded = log.decoded;

      if (!decoded) {
        return (
          <div className={`h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border cursor-pointer hover:bg-bg-secondary ${isSelected ? 'bg-selected-dark' : ''}`}
            onClick={() => onSelectRow(log.id, filteredIdx)}>
            <div className={`w-[3px] h-full flex-shrink-0 mr-2 ${isSelected ? 'bg-accent-yellow' : 'bg-transparent'}`} />
            <span className="text-border">-</span>
          </div>
        );
      }

      // 使用 DecodedResult 的字段
      const tagColor = BADGE_COLORS[decoded.badge] || 'default';

      return (
        <div className={`h-6 flex items-center text-[13px] whitespace-nowrap border-b border-border cursor-pointer gap-2 hover:bg-bg-secondary ${isSelected ? 'bg-selected-dark' : ''}`}
          onClick={() => onSelectRow(log.id, filteredIdx)}>
          
          <div className={`w-[3px] h-full flex-shrink-0 mr-2 ${isSelected ? 'bg-accent-yellow' : 'bg-transparent'}`} />
          
          <Tag color={tagColor} className="text-[10px] m-0 leading-none uppercase font-mono flex-shrink-0">
            {decoded.badge}
          </Tag>
          
          <span className="text-accent-yellow text-[11px] font-mono flex-shrink-0">{decoded.rawValue}</span>
          
          <span className="text-accent-green font-medium text-xs flex-shrink-0">
            {decoded.name}
          </span>
          
          <span className="text-text-secondary text-[11px] flex-shrink-0">{decoded.desc}</span>
        </div>
      );
    }, [allLogs, filteredIndices, selectedId, onSelectRow]);

    return (
      <div className="flex flex-col h-full min-h-0 bg-bg-primary">
        <VirtualList ref={listRef} totalItems={filteredIndices.length} renderItem={renderRow}
          scrollTop={scrollTop} onScroll={onScroll} className="flex-1" />
      </div>
    );
  }
);

DecodePanel.displayName = 'DecodePanel';
export default DecodePanel;