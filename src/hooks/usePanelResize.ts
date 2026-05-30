import { useState, useCallback, useRef, useEffect } from 'react';
import type { PanelSizes } from '@/types';

export function usePanelResize(initial: PanelSizes = { leftWidth: 50, thumbWidth: 80 }) {
  const [sizes, setSizes] = useState<PanelSizes>(initial);
  const draggingRef = useRef<{ type: 'left' | 'thumb' | null }>({ type: null });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startResizeLeft = useCallback(() => {
    draggingRef.current.type = 'left';
    document.body.style.cursor = 'col-resize';
  }, []);

  const startResizeThumb = useCallback(() => {
    draggingRef.current.type = 'thumb';
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current.type || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (draggingRef.current.type === 'left') {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSizes((prev) => ({ ...prev, leftWidth: Math.max(20, Math.min(70, pct)) }));
    } else if (draggingRef.current.type === 'thumb') {
      const newWidth = rect.right - e.clientX - 3;
      setSizes((prev) => ({ ...prev, thumbWidth: Math.max(40, Math.min(200, newWidth)) }));
    }
  }, []);

  const stopResize = useCallback(() => {
    draggingRef.current.type = null;
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [handleMouseMove, stopResize]);

  return { sizes, containerRef, startResizeLeft, startResizeThumb };
}