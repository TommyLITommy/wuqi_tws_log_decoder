import { App as AntApp } from 'antd';
import Toolbar from '@/components/Toolbar';
import MainLayout from '@/components/MainLayout';
import { useLogData } from '@/hooks/useLogData';
import { usePanelResize } from '@/hooks/usePanelResize';

export default function App() {
  const { allLogs, filteredIndices, filterText, coreFilter, selectedId, currentFileName, decodedMatchCount,
    isLoading, loadingProgress, loadFile, filterLogs, updateCoreFilter, clearAll, selectRow } = useLogData();

  const { sizes, containerRef, startResizeLeft, startResizeThumb } = usePanelResize({
    leftWidth: 50, thumbWidth: 80
  });

  return (
    <AntApp>
      <div ref={containerRef} className="h-screen w-screen flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">
        <Toolbar 
          fileName={currentFileName} 
          filterText={filterText}
          coreFilter={coreFilter}
          totalLines={allLogs.length}
          filteredLines={filteredIndices.length} 
          decodedMatchCount={decodedMatchCount}
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          onLoadFile={loadFile} 
          onFilterChange={filterLogs}
          onCoreFilterChange={updateCoreFilter}
          onClear={clearAll} 
        />
        <MainLayout 
          allLogs={allLogs} 
          filteredIndices={filteredIndices} 
          selectedId={selectedId}
          filterText={filterText}
          leftWidth={sizes.leftWidth} 
          thumbWidth={sizes.thumbWidth}
          onSelectRow={selectRow} 
          startResizeLeft={startResizeLeft} 
          startResizeThumb={startResizeThumb} 
        />
      </div>
    </AntApp>
  );
}