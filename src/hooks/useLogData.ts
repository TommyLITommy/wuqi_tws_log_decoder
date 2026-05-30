import { useState, useCallback, useMemo } from 'react';
import { parseLogLine } from '@/parsers/registry';
import { toDecodedResult } from '@/parsers/adapter';
import type { LogEntry, DecodedResult } from '@/types';

// ==================== 常量配置 ====================
const READER_CHUNK_SIZE = 1024 * 1024; // 1MB分块读取
const FILE_ENCODING = 'utf-8';
const FILTER_REGEX_FLAGS = 'i'; // 不区分大小写

/**
 * 日志数据管理Hook
 * 功能：大文件日志加载、分块解析、智能过滤、状态管理
 */
export function useLogData() {
  // ==================== 状态定义 ====================
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [filteredIndices, setFilteredIndices] = useState<number[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // ==================== 工具函数 ====================
  /**
   * 构建过滤正则表达式：支持|分隔多关键词、原生正则
   */
  const buildFilterRegex = useCallback((text: string): RegExp | null => {
    if (!text.trim()) return null;

    // 分割关键词并过滤空值
    const keywordParts = text.split('|').map(item => item.trim()).filter(Boolean);
    if (!keywordParts.length) return null;

    const validPatterns: string[] = [];

    keywordParts.forEach(part => {
      try {
        // 处理用户输入的正则表达式 格式：/xxx/
        if (part.startsWith('/') && part.lastIndexOf('/') > 0) {
          const lastSlashIndex = part.lastIndexOf('/');
          const regexPattern = part.slice(1, lastSlashIndex).trim();
          if (regexPattern) validPatterns.push(`(?:${regexPattern})`);
        } 
        // 处理普通文本：转义特殊字符
        else {
          const escapedText = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          validPatterns.push(`(?:${escapedText})`);
        }
      } catch {
        // 静默忽略无效正则，避免程序崩溃
      }
    });

    return validPatterns.length ? new RegExp(validPatterns.join('|'), FILTER_REGEX_FLAGS) : null;
  }, []);

  /**
   * 单条日志匹配过滤规则
   */
  const isLogMatched = useCallback((log: LogEntry, searchText: string, regex: RegExp | null): boolean => {
    const lowerText = searchText.toLowerCase();
    
    // 正则匹配模式
    if (regex) {
      return regex.test(log.raw) || 
             !!(log.decoded && (
               regex.test(log.decoded.name) || 
               regex.test(log.decoded.desc) ||
               regex.test(log.decoded.badge)
             ));
    }

    // 普通文本匹配模式
    return log.raw.toLowerCase().includes(lowerText) || 
           !!(log.decoded && (
             log.decoded.name.toLowerCase().includes(lowerText) ||
             log.decoded.desc.toLowerCase().includes(lowerText) ||
             log.decoded.badge.toLowerCase().includes(lowerText)
           ));
  }, []);

  // ==================== 核心业务函数 ====================
  /**
   * 分块加载并解析日志文件
   */
  const loadFile = useCallback((file: File) => {
    // 初始化状态
    setCurrentFileName(file.name);
    setIsLoading(true);
    setLoadingProgress(0);

    const reader = new FileReader();
    let currentOffset = 0;
    let fullFileText = '';

    // 分块读取方法
    const readNextChunk = () => {
      const fileSlice = file.slice(currentOffset, currentOffset + READER_CHUNK_SIZE);
      reader.readAsText(fileSlice, FILE_ENCODING);
    };

    // 读取成功回调
    reader.onload = (e) => {
      try {
        const chunk = e.target?.result as string;
        fullFileText += chunk;
        currentOffset += READER_CHUNK_SIZE;

        // 更新加载进度
        const progress = Math.min(100, Math.floor((currentOffset / file.size) * 100));
        setLoadingProgress(progress);

        // 未读取完成，继续读取下一块
        if (currentOffset < file.size) {
          readNextChunk();
          return;
        }

        // ==================== 日志解析核心逻辑 ====================
        // 分割行并过滤空行
        const logLines = fullFileText.split(/\r?\n/).filter(line => line.trim());
        
        // 解析每行日志
        const parsedLogs: LogEntry[] = logLines.map((line, index) => {
          const parseResult = parseLogLine(line);
          const decoded: DecodedResult | null = parseResult ? toDecodedResult(parseResult, line) : null;
          
          return { id: index, raw: line, decoded };
        });

        // 更新状态
        setAllLogs(parsedLogs);
        setFilteredIndices(parsedLogs.map((_, index) => index));
        setSelectedId(null);
      } catch (error) {
        console.error('日志解析失败：', error);
        alert('日志解析失败，请检查文件格式');
      } finally {
        // 无论成功失败，结束加载状态
        setIsLoading(false);
        setLoadingProgress(100);
      }
    };

    // 读取失败回调
    reader.onerror = () => {
      console.error('文件读取错误：', reader.error);
      setIsLoading(false);
      setLoadingProgress(0);
      alert('文件读取失败，请重试');
    };

    // 开始读取第一块
    readNextChunk();
  }, []);

  /**
   * 日志过滤搜索
   */
  const filterLogs = useCallback((searchText: string) => {
    setFilterText(searchText);
    const trimmedText = searchText.trim();

    // 空文本：显示全部
    if (!trimmedText) {
      setFilteredIndices(allLogs.map((_, index) => index));
      setSelectedId(null);
      return;
    }

    // 构建正则并过滤
    const regex = buildFilterRegex(trimmedText);
    const matchedIndices = allLogs
      .map((_, index) => index)
      .filter(index => isLogMatched(allLogs[index], trimmedText, regex));

    setFilteredIndices(matchedIndices);
    setSelectedId(null);
  }, [allLogs, buildFilterRegex, isLogMatched]);

  /**
   * 清空所有数据
   */
  const clearAll = useCallback(() => {
    setAllLogs([]);
    setFilteredIndices([]);
    setFilterText('');
    setSelectedId(null);
    setCurrentFileName('');
    setIsLoading(false);
    setLoadingProgress(0);
  }, []);

  /**
   * 选中指定行日志
   */
  const selectRow = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  // ==================== 计算属性 ====================
  /**
   * 已解析的日志数量（统计过滤结果中成功解析的行数）
   */
  const decodedMatchCount = useMemo(() => {
    return filteredIndices.reduce((count, index) => {
      return allLogs[index]?.decoded ? count + 1 : count;
    }, 0);
  }, [allLogs, filteredIndices]);

  /**
   * 当前展示的过滤后日志列表（视图层直接使用）
   */
  const filteredLogs = useMemo(() => {
    return filteredIndices.map(index => allLogs[index]);
  }, [allLogs, filteredIndices]);

  // ==================== 返回值 ====================
  return {
    // 数据源
    allLogs,
    filteredLogs, // 新增：直接提供过滤后的日志，组件更易用
    // 过滤状态
    filteredIndices,
    filterText,
    // 选中状态
    selectedId,
    // 文件信息
    currentFileName,
    // 统计数据
    decodedMatchCount,
    // 加载状态
    isLoading,
    loadingProgress,
    // 操作方法
    loadFile,
    filterLogs,
    clearAll,
    selectRow,
  };
}