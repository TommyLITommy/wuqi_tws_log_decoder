import { Button } from 'antd';
import { CompressOutlined, MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';

interface TimelineToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
}

function formatZoom(z: number): string {
  if (z >= 100) return `${Math.round(z * 100).toLocaleString()}%`;
  if (z >= 1) return `${Math.round(z * 100)}%`;
  if (z >= 0.01) return `${Math.round(z * 100)}%`;
  return `${(z * 100).toFixed(2)}%`;
}

export function TimelineToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
}: TimelineToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <Button size="small" icon={<MinusOutlined />} onClick={onZoomOut} title="缩小" />
      <span className="min-w-[70px] px-2 py-1 text-center font-mono text-xs text-text-secondary">
        {formatZoom(zoom)}
      </span>
      <Button size="small" icon={<PlusOutlined />} onClick={onZoomIn} title="放大" />
      <Button size="small" icon={<CompressOutlined />} onClick={onFit} title="适应窗口">
        适应
      </Button>
      <Button size="small" icon={<ReloadOutlined />} onClick={onReset} title="重置">
        重置
      </Button>
    </div>
  );
}
