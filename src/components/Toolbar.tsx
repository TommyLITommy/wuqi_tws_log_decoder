import { useRef, useCallback } from 'react';
import { Button, Input, Space, Tooltip, Progress, Checkbox } from 'antd';
import { FolderOpenOutlined, ClearOutlined, LoadingOutlined } from '@ant-design/icons';
import type { CoreFilter } from '@/hooks/useLogData';

interface ToolbarProps {
  fileName: string;
  filterText: string;
  coreFilter: CoreFilter;
  totalLines: number;
  filteredLines: number;
  decodedMatchCount: number;
  isLoading: boolean;
  loadingProgress: number;
  onLoadFile: (file: File) => void;
  onFilterChange: (text: string) => void;
  onCoreFilterChange: (key: keyof CoreFilter, value: boolean) => void;
  onClear: () => void;
}

export default function Toolbar({ fileName, filterText, coreFilter, totalLines, filteredLines, decodedMatchCount,
  isLoading, loadingProgress, onLoadFile, onFilterChange, onCoreFilterChange, onClear }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoadFile(file);
    e.target.value = '';
  }, [onLoadFile]);

  return (
    <div className="h-12 bg-bg-secondary border-b border-border flex items-center px-4 gap-4 flex-shrink-0 select-none whitespace-nowrap">
      <input ref={fileInputRef} type="file" accept=".log,.txt,.csv" onChange={handleFileChange} className="hidden" />
      <Button 
        type="primary" 
        icon={isLoading ? <LoadingOutlined spin /> : <FolderOpenOutlined />} 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? '加载中...' : '打开 TWS Log'}
      </Button>
      
      {/* 加载进度条 */}
      {isLoading && (
        <div className="w-[200px] flex items-center gap-2">
          <Progress 
            percent={loadingProgress} 
            size="small" 
            showInfo={false}
            strokeColor="#2563eb"
            railColor="#334155"
            className="flex-1"
          />
          <span className="text-xs text-text-secondary">{loadingProgress}%</span>
        </div>
      )}
      
      <Tooltip title={fileName || '未选择文件'} placement="bottom">
        <span className="text-sm text-accent-green max-w-[200px] truncate cursor-default">
          {fileName || '未选择文件'}
        </span>
      </Tooltip>
      <Input placeholder="过滤日志..." value={filterText} onChange={(e) => onFilterChange(e.target.value)}
        className="w-[300px]" style={{ background: '#0f172a', borderColor: '#475569', color: '#e2e8f0' }} allowClear />
      <Space className="text-xs text-text-primary flex-shrink-0 [&_.ant-checkbox-wrapper]:text-text-primary [&_.ant-checkbox-label]:text-text-primary">
        <Checkbox
          checked={coreFilter.showAcore}
          onChange={(e) => onCoreFilterChange('showAcore', e.target.checked)}
        >
          Acore
        </Checkbox>
        <Checkbox
          checked={coreFilter.showBcore}
          onChange={(e) => onCoreFilterChange('showBcore', e.target.checked)}
        >
          Bcore
        </Checkbox>
        <Checkbox
          checked={coreFilter.showDcore}
          onChange={(e) => onCoreFilterChange('showDcore', e.target.checked)}
        >
          Dcore
        </Checkbox>
      </Space>
      <Space className="text-xs text-text-secondary ml-auto flex-shrink-0">
        <span className="whitespace-nowrap">总行: <span className="text-text-primary font-mono">{totalLines?.toLocaleString()}</span></span>
        <span className="whitespace-nowrap">过滤: <span className="text-text-primary font-mono">{filteredLines?.toLocaleString()}</span></span>
        <span className="whitespace-nowrap">匹配: <span className="text-accent-yellow font-mono">{decodedMatchCount?.toLocaleString()}</span></span>
      </Space>
      <Button icon={<ClearOutlined />} onClick={onClear} className="text-text-secondary hover:text-text-primary flex-shrink-0">
        清空
      </Button>
    </div>
  );
}