import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ITEM_HEIGHT } from '@/utils/constants';

export interface VirtualListHandle {
  scrollTo: (scrollTop: number) => void;
  getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
}

interface VirtualListProps {
  totalItems: number;
  renderItem: (index: number) => React.ReactNode;
  scrollTop?: number;
  onScroll?: (scrollTop: number) => void;
  className?: string;
}

const VirtualList = forwardRef<VirtualListHandle, VirtualListProps>(
  ({ totalItems, renderItem, scrollTop, onScroll, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isExternalScrollRef = useRef(false);

    useImperativeHandle(ref, () => ({
      scrollTo: (top: number) => {
        if (containerRef.current) {
          isExternalScrollRef.current = true;
          containerRef.current.scrollTop = top;
          requestAnimationFrame(() => { isExternalScrollRef.current = false; });
        }
      },
      getScrollInfo: () => ({
        scrollTop: containerRef.current?.scrollTop || 0,
        scrollHeight: containerRef.current?.scrollHeight || 0,
        clientHeight: containerRef.current?.clientHeight || 0,
      }),
    }));

    useEffect(() => {
      if (scrollTop !== undefined && containerRef.current && !isExternalScrollRef.current) {
        const current = containerRef.current.scrollTop;
        if (Math.abs(current - scrollTop) > 1) {
          isExternalScrollRef.current = true;
          containerRef.current.scrollTop = scrollTop;
          requestAnimationFrame(() => { isExternalScrollRef.current = false; });
        }
      }
    }, [scrollTop]);

    const handleScroll = useCallback(() => {
      if (!containerRef.current || !onScroll || isExternalScrollRef.current) return;
      requestAnimationFrame(() => {
        onScroll(containerRef.current!.scrollTop);
      });
    }, [onScroll]);

    const container = containerRef.current;
    const currentScrollTop = container?.scrollTop || 0;
    const containerHeight = container?.clientHeight || 600;
    const startIdx = Math.floor(currentScrollTop / ITEM_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + 2;
    const endIdx = Math.min(startIdx + visibleCount, totalItems);
    const totalHeight = totalItems * ITEM_HEIGHT;

    return (
      <div ref={containerRef} className={`overflow-auto relative ${className}`} onScroll={handleScroll}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          {Array.from({ length: Math.max(0, endIdx - startIdx) }, (_, i) => {
            const idx = startIdx + i;
            return (
              <div key={idx} style={{ position: 'absolute', top: idx * ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT }}>
                {renderItem(idx)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';
export default VirtualList;