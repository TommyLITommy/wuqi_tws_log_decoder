import { useCallback } from 'react';

interface ResizerProps {
  onResizeStart: () => void;
  className?: string;
}

export default function Resizer({ onResizeStart, className = '' }: ResizerProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onResizeStart();
  }, [onResizeStart]);

  return (
    <div className={`w-[6px] bg-border hover:bg-accent-blue cursor-col-resize relative flex-shrink-0 transition-colors ${className}`}
      onMouseDown={handleMouseDown} />
  );
}