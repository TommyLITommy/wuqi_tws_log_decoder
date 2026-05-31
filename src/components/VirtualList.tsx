import {
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
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

const OVERSCAN = 8;

const VirtualList = forwardRef<VirtualListHandle, VirtualListProps>(
  ({ totalItems, renderItem, scrollTop: externalScrollTop, onScroll, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const isExternalScrollRef = useRef(false);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const updateHeight = () => setContainerHeight(el.clientHeight);
      updateHeight();

      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
      if (externalScrollTop === undefined || !containerRef.current) return;
      if (Math.abs(containerRef.current.scrollTop - externalScrollTop) <= 1) return;

      isExternalScrollRef.current = true;
      containerRef.current.scrollTop = externalScrollTop;
      setScrollTop(externalScrollTop);
      requestAnimationFrame(() => {
        isExternalScrollRef.current = false;
      });
    }, [externalScrollTop]);

    useImperativeHandle(ref, () => ({
      scrollTo: (top: number) => {
        isExternalScrollRef.current = true;
        setScrollTop(top);
        if (containerRef.current) {
          containerRef.current.scrollTop = top;
        }
        requestAnimationFrame(() => {
          isExternalScrollRef.current = false;
        });
      },
      getScrollInfo: () => ({
        scrollTop: containerRef.current?.scrollTop ?? scrollTop,
        scrollHeight: totalItems * ITEM_HEIGHT,
        clientHeight: containerRef.current?.clientHeight ?? containerHeight,
      }),
    }), [scrollTop, containerHeight, totalItems]);

    const handleScroll = useCallback(() => {
      if (!containerRef.current || isExternalScrollRef.current) return;
      const top = containerRef.current.scrollTop;
      setScrollTop(top);
      onScroll?.(top);
    }, [onScroll]);

    const effectiveHeight = containerHeight || 600;
    const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const endIdx = Math.min(
      totalItems,
      Math.ceil((scrollTop + effectiveHeight) / ITEM_HEIGHT) + OVERSCAN
    );
    const totalHeight = totalItems * ITEM_HEIGHT;
    const offsetY = startIdx * ITEM_HEIGHT;

    return (
      <div
        ref={containerRef}
        className={`overflow-auto relative min-h-0 ${className}`}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative', minWidth: '100%', width: 'max-content' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              minWidth: '100%',
              width: 'max-content',
            }}
          >
            {Array.from({ length: Math.max(0, endIdx - startIdx) }, (_, i) => {
              const idx = startIdx + i;
              return (
                <div
                  key={idx}
                  style={{ height: ITEM_HEIGHT, minWidth: '100%', width: 'max-content' }}
                >
                  {renderItem(idx)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';
export default VirtualList;
