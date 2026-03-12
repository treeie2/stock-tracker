
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FilePlus,
  Search,
  Database,
  Loader2,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronLeft,
  Calendar,
  RefreshCw,
  TrendingUp,
  History,
  Clock,
  Layers,
  Target,
  Quote,
  Tag,
  CheckCircle2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  BarChart3,
  Upload,
  Rss,
  Bot,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Package,
  TrendingUp as PriceIcon
} from 'lucide-react';
import type { Stock, AnalysisRecord, ExtractedInfo } from './types/index';
import { ViewMode } from './types/index';
import type { PriceIncreaseConcept } from './types/priceMonitor';
import PriceMonitor from './components/PriceMonitor';
import { extractStockInfoFromText } from './geminiService';
import { fetchStockPrice } from './tushareService';
import { parseLocalStockFile } from './localFileParser';
import { saveToIndexedDb, loadFromIndexedDb, saveHistoryToIndexedDb } from './storageService';
import { saveToCloud, loadFromCloud } from './cloudStorageService';

interface SystemLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  detail?: any;
}

const App: React.FC = () => {
  // 1. 状态管理
  const location = useLocation();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取今天的日期字符串（YYYY-MM-DD格式）
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 监听URL变化，设置对应的viewMode
  useEffect(() => {
    const path = location.pathname;
    if (path === '/price-monitor') {
      setViewMode(ViewMode.PRICE_MONITOR);
    } else if (path === '/import') {
      setViewMode(ViewMode.IMPORT);
    } else if (path.startsWith('/detail/')) {
      const stockId = path.split('/').pop();
      if (stockId) {
        setSelectedStockId(stockId);
        setViewMode(ViewMode.DETAIL);
      } else {
        setViewMode(ViewMode.DASHBOARD);
      }
    } else {
      setViewMode(ViewMode.DASHBOARD);
    }
  }, [location.pathname]);

  const [isExtracting, setIsExtracting] = useState(false);
  const [importText, setImportText] = useState('');
  const [manualImportDate, setManualImportDate] = useState('');
  const [extractedPreview, setExtractedPreview] = useState<ExtractedInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 历史数据管理
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<{ date: string, stocks: Stock[], updatedAt: string }[]>([]);

  // 日志系统
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 微信公众号研报数据
  const [wechatReports, setWechatReports] = useState<ExtractedInfo[]>([]);
  const [isWechatReportsOpen, setIsWechatReportsOpen] = useState(false);
  const [isFetchingWechatReports, setIsFetchingWechatReports] = useState(false);

  // JSON库数据
  const [jsonLibraryStats, setJsonLibraryStats] = useState<any>(null);
  const [jsonLibraryArticles, setJsonLibraryArticles] = useState<any[]>([]);
  const [isJsonLibraryOpen, setIsJsonLibraryOpen] = useState(false);
  const [isFetchingJsonLibrary, setIsFetchingJsonLibrary] = useState(false);
  const [jsonLibraryFilter, setJsonLibraryFilter] = useState<string>('all');
  const [jsonLibrarySearch, setJsonLibrarySearch] = useState<string>('');
  const [jsonLibrarySortBy, setJsonLibrarySortBy] = useState<string>('date');
  const [jsonLibrarySortOrder, setJsonLibrarySortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  // 涨价监控数据
  const [priceMonitorConcepts, setPriceMonitorConcepts] = useState<PriceIncreaseConcept[]>([]);

  const addLog = (message: string, type: SystemLog['type'] = 'info', detail?: any) => {
    const newLog: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      time: new Date().toLocaleTimeString(),
      type,
      message,
      detail
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  // 2. 数据持久化
  useEffect(() => {
    if (stocks.length > 0) {
      console.log('数据发生变化，开始保存...', { stockCount: stocks.length });
      
      try {
        // 保存到localStorage
        console.log('保存到localStorage...');
        const stocksJson = JSON.stringify(stocks);
        const dataSize = new Blob([stocksJson]).size;
        const sizeInMB = (dataSize / 1024 / 1024).toFixed(2);
        console.log(`数据大小: ${sizeInMB} MB`);
        
        if (dataSize > 5 * 1024 * 1024) { // 超过5MB
          console.warn('数据大小超过localStorage限制，仅保存到IndexedDB');
          addLog(`警告: 数据大小 ${sizeInMB} MB，超过localStorage限制，仅保存到IndexedDB`, 'warning');
        } else {
          localStorage.setItem('stock_tracker_db_v4_final', stocksJson);
          console.log('localStorage保存成功');
        }

        // 保存到IndexedDB
        console.log('保存到IndexedDB...');
        saveToIndexedDb(stocks).then(() => {
          console.log('IndexedDB保存成功');
          addLog('数据已同步到IndexedDB', 'info');
        }).catch(error => {
          console.error('IndexedDB保存失败:', error);
          addLog(`同步到IndexedDB失败: ${error}`, 'warning');
        });

        // 按日期保存数据，确保今天的处理结果被单独保存
        const todayDate = getTodayDate();
        const todayStockData = {
          stocks: stocks,
          updatedAt: new Date().toISOString(),
          changes: stocks.length // 可以根据需要添加更详细的变更信息
        };
        console.log('保存今天的数据到localStorage...');
        const todayDataJson = JSON.stringify(todayStockData);
        const todayDataSize = new Blob([todayDataJson]).size;
        
        if (todayDataSize <= 5 * 1024 * 1024) {
          localStorage.setItem(`stock_tracker_db_${todayDate}`, todayDataJson);
          console.log('今天的数据保存成功');
        } else {
          console.warn('今天的数据超过localStorage限制，仅保存到IndexedDB');
        }

        // 保存历史数据到IndexedDB
        console.log('保存历史数据到IndexedDB...');
        saveHistoryToIndexedDb(todayDate, todayStockData).then(() => {
          console.log('历史数据IndexedDB保存成功');
          addLog(`历史数据已同步到IndexedDB (${todayDate})`, 'info');
        }).catch(error => {
          console.error('历史数据IndexedDB保存失败:', error);
          addLog(`同步历史数据到IndexedDB失败: ${error}`, 'warning');
        });

        // 保存日期索引，用于快速访问历史数据
        try {
          const dateIndex = JSON.parse(localStorage.getItem('stock_tracker_date_index') || '[]');
          if (!dateIndex.includes(todayDate)) {
            dateIndex.push(todayDate);
            dateIndex.sort((a: string, b: string) => b.localeCompare(a)); // 按日期降序排序
            localStorage.setItem('stock_tracker_date_index', JSON.stringify(dateIndex));
            console.log('日期索引保存成功');
          }
        } catch (indexError) {
          console.error('保存日期索引失败:', indexError);
          // 重置日期索引
          localStorage.setItem('stock_tracker_date_index', JSON.stringify([todayDate]));
        }
      } catch (saveError) {
        console.error('数据保存失败:', saveError);
        addLog(`数据保存失败: ${saveError}`, 'error');
        // 即使localStorage失败，也要尝试保存到IndexedDB
        saveToIndexedDb(stocks).catch(error => {
          console.error('IndexedDB保存也失败:', error);
        });
      }
    } else {
      console.log('没有数据需要保存');
    }
  }, [stocks]);

  // 涨价监控数据持久化
  useEffect(() => {
    if (priceMonitorConcepts.length > 0) {
      localStorage.setItem('price_monitor_concepts', JSON.stringify(priceMonitorConcepts));
      addLog('涨价监控数据已保存', 'info');
    }
  }, [priceMonitorConcepts]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('开始加载数据...');

        // 优先从云端加载数据
        try {
          console.log('尝试从云端加载数据...');
          const cloudData = await loadFromCloud();
          
          if (cloudData.length > 0) {
            console.log('从云端加载数据成功:', { count: cloudData.length });
            setStocks(cloudData);
            addLog('从云端加载数据成功', 'success', { count: cloudData.length });

            // 同时保存到本地存储
            localStorage.setItem('stock_tracker_db_v4_final', JSON.stringify(cloudData));
            await saveToIndexedDb(cloudData);
            addLog('数据已同步到本地存储', 'info');
            return;
          }
        } catch (cloudError) {
          console.log('云端加载失败，尝试本地存储:', cloudError);
          addLog('云端加载失败，使用本地存储', 'warning');
        }

        // 如果云端没有数据，尝试从本地存储加载
        let loadedData: Stock[] = [];
        const localStorageData = localStorage.getItem('stock_tracker_db_v4_final');
        console.log('localStorage数据存在:', !!localStorageData);

        if (localStorageData) {
          console.log('从localStorage加载数据...');
          try {
            const parsedData = JSON.parse(localStorageData);
            console.log('localStorage数据解析成功:', { count: parsedData.length });
            loadedData = parsedData;
            setStocks(parsedData);
            addLog('从localStorage加载数据成功', 'success', { count: parsedData.length });

            // 检查数据大小
            const dataSize = new Blob([localStorageData]).size;
            const sizeInMB = (dataSize / 1024 / 1024).toFixed(2);
            console.log(`数据大小: ${sizeInMB} MB`);
            if (dataSize > 4 * 1024 * 1024) { // 超过4MB警告
              addLog(`警告: 数据大小 ${sizeInMB} MB，接近localStorage存储限制`, 'warning');
            }

            // 同时保存到IndexedDB
            console.log('正在将localStorage数据同步到IndexedDB...');
            await saveToIndexedDb(parsedData);
            addLog('数据已同步到IndexedDB', 'info');
          } catch (parseError) {
            console.error('localStorage数据解析失败:', parseError);
            addLog('localStorage数据损坏，尝试从IndexedDB恢复', 'error');
            // 尝试从IndexedDB加载
            const indexedDbData = await loadFromIndexedDb();
            if (indexedDbData.length > 0) {
              loadedData = indexedDbData;
              setStocks(indexedDbData);
              addLog('从IndexedDB恢复数据成功', 'success', { count: indexedDbData.length });
              // 重新保存到localStorage
              localStorage.setItem('stock_tracker_db_v4_final', JSON.stringify(indexedDbData));
            }
          }
        } else {
          // 如果localStorage没有数据，尝试从IndexedDB加载
          console.log('localStorage没有数据，尝试从IndexedDB加载...');
          try {
            const indexedDbData = await loadFromIndexedDb();
            if (indexedDbData.length > 0) {
              loadedData = indexedDbData;
              setStocks(indexedDbData);
              addLog('从IndexedDB加载数据成功', 'success', { count: indexedDbData.length });

              // 同时保存到localStorage
              console.log('正在将IndexedDB数据同步到localStorage...');
              const dataStr = JSON.stringify(indexedDbData);
              localStorage.setItem('stock_tracker_db_v4_final', dataStr);
              addLog('数据已同步到localStorage', 'info');
            } else {
              console.log('所有存储位置都没有数据');
            }
          } catch (dbError) {
            console.error('IndexedDB加载失败:', dbError);
            addLog('IndexedDB加载失败', 'error');
          }
        }

        // 加载涨价监控数据
        const priceMonitorData = localStorage.getItem('price_monitor_concepts');
        if (priceMonitorData) {
          try {
            setPriceMonitorConcepts(JSON.parse(priceMonitorData));
            addLog('加载涨价监控数据成功', 'success');
          } catch (parseError) {
            console.error('涨价监控数据解析失败:', parseError);
            addLog('涨价监控数据损坏', 'error');
            // 重置涨价监控数据
            setPriceMonitorConcepts([]);
          }
        }
      } catch (error: any) {
        console.error('加载数据失败:', error);
        addLog(`加载数据失败: ${error.message}`, 'error', error);
      } finally {
        setIsLoading(false);
        console.log('数据加载完成');
      }
    };

    loadData();
  }, []);

  // 滚动日志到底部
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // 3. 核心业务
  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stocks;
    return stocks.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.includes(q) ||
      s.sector.toLowerCase().includes(q) ||
      (s.concepts || []).some(c => c.toLowerCase().includes(q)) ||
      (s.products || []).some(p => p.toLowerCase().includes(q)) ||
      (s.records || []).some(r => (r.content || r.logic || r.title || '').toLowerCase().includes(q))
    );
  }, [stocks, searchQuery]);

  const handleExtract = async () => {
    if (!importText.trim()) return;
    setIsExtracting(true);
    setExtractedPreview([]);
    setLastError(null);

    // 尝试解析JSON格式
    try {
      const trimmedText = importText.trim();
      if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
        addLog("检测到JSON格式，尝试直接解析...", "info");
        const jsonData = JSON.parse(trimmedText);

        // 处理单条记录
        if (jsonData.stockName) {
          console.log('解析单个JSON对象');
          const extracted: ExtractedInfo = {
            stockName: jsonData.stockName || '',
            stockCode: jsonData.stockCode || '',
            title: jsonData.title || `${jsonData.date || new Date().toLocaleDateString()} 研报更新`,
            logic: jsonData.logic || jsonData.content || '',
            date: jsonData.date || '',
            sector: jsonData.sector || jsonData.concepts?.[0] || '',
            concepts: jsonData.concepts || [],
            products: jsonData.products || [],
            targetValuation: jsonData.targetValuation || '',
            dataPoints: jsonData.dataPoints || []
          };
          setExtractedPreview([extracted]);
          addLog(`JSON解析成功，识别到 1 个标的`, "success", [extracted]);
          setIsExtracting(false);
          return;
        }

        // 处理多条记录数组
        if (Array.isArray(jsonData)) {
          console.log('解析JSON数组，包含', jsonData.length, '条记录');
          const extractedData = jsonData.map((item: Partial<ExtractedInfo> & { content?: string }) => ({
            stockName: item.stockName || '',
            stockCode: item.stockCode || '',
            title: item.title || `${item.date || new Date().toLocaleDateString()} 研报更新`,
            logic: item.logic || item.content || '',
            date: item.date || '',
            sector: item.sector || item.concepts?.[0] || '',
            concepts: item.concepts || [],
            products: item.products || [],
            targetValuation: item.targetValuation || '',
            dataPoints: item.dataPoints || []
          })).filter((item: ExtractedInfo) => item.stockName);
          setExtractedPreview(extractedData);
          addLog(`JSON解析成功，识别到 ${extractedData.length} 个标的`, "success", extractedData);
          setIsExtracting(false);
          return;
        }

        // 处理包含stocks字段的对象
        if (jsonData.stocks && Array.isArray(jsonData.stocks)) {
          console.log('解析包含stocks字段的JSON对象，包含', jsonData.stocks.length, '条记录');
          const extractedData = jsonData.stocks.map((stock: any) => ({
            stockName: stock.name || stock.stockName || '',
            stockCode: stock.code || stock.stockCode || '',
            title: stock.records?.[0]?.title || `${stock.records?.[0]?.customDate || new Date().toLocaleDateString()} 研报更新`,
            logic: stock.records?.[0]?.logic || stock.records?.[0]?.content || '',
            date: stock.records?.[0]?.customDate || stock.records?.[0]?.timestamp || '',
            sector: stock.sector || '',
            concepts: stock.concepts || [],
            products: stock.products || [],
            targetValuation: stock.targetValuation || '',
            dataPoints: stock.records?.[0]?.dataPoints || []
          })).filter((item: ExtractedInfo) => item.stockName);
          setExtractedPreview(extractedData);
          addLog(`JSON解析成功，识别到 ${extractedData.length} 个标的`, "success", extractedData);
          setIsExtracting(false);
          return;
        }
      }
    } catch (jsonError) {
      console.log('JSON解析失败，尝试通过AI引擎解析:', jsonError);
      // JSON解析失败，继续尝试AI引擎解析
    }

    // 通过 AI 引擎解析文本
    addLog("正在通过 AI 引擎解析文本...", "info");
    try {
      const result = await extractStockInfoFromText(importText);
      if (result.data && result.data.length > 0) {
        setExtractedPreview(result.data);
        addLog(`AI 解析成功，识别到 ${result.data.length} 个标的`, "success", result.data);

        // 显示 Tushare 查询结果
        if (result.stockInfoMap && result.stockInfoMap.size > 0) {
          const matched = Array.from(result.stockInfoMap.entries())
            .filter(([_, info]) => info !== null);
          const unmatched = Array.from(result.stockInfoMap.entries())
            .filter(([_, info]) => info === null);

          if (matched.length > 0) {
            addLog(`本地数据库查询成功: ${matched.length} 个股票代码已匹配`, "success",
              matched.map(([name, info]) => ({ name, code: info?.symbol })));
          }
          if (unmatched.length > 0) {
            addLog(`本地数据库未匹配: ${unmatched.length} 个股票`, "warning",
              unmatched.map(([name, _]) => name));
          }
        }
      } else {
        throw new Error("AI 未能识别到有效的股票信息，请检查文本格式。");
      }
    } catch (error: any) {
      const errorMsg = error.message || "未知 API 错误";
      setLastError(errorMsg);
      addLog(`解析失败 (API Error): ${errorMsg}`, "error", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setExtractedPreview([]);
    setLastError(null);
    addLog(`正在解析本地文件: ${file.name}`, "info");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const extractedData = parseLocalStockFile(text);

        if (extractedData.length > 0) {
          setExtractedPreview(extractedData);
          addLog(`本地文件解析成功，识别到 ${extractedData.length} 个标的`, "success", extractedData);
        } else {
          throw new Error("未能从文件中识别到有效的股票信息，请检查文件格式。");
        }
      } catch (error: any) {
        const errorMsg = error.message || "文件解析失败";
        setLastError(errorMsg);
        addLog(`文件解析失败: ${errorMsg}`, "error", error);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      const errorMsg = "文件读取失败";
      setLastError(errorMsg);
      addLog(`文件读取失败`, "error");
      setIsUploading(false);
    };

    reader.readAsText(file, 'utf-8');
  };

  const confirmImport = () => {
    if (extractedPreview.length === 0) return;
    addLog("开始批量合并入库...", "info");
    addLog(`共解析到 ${extractedPreview.length} 条记录`, "info", extractedPreview.map(i => ({ name: i.stockName, code: i.stockCode })));

    setStocks(prevStocks => {
      const newStocks = [...prevStocks];

      extractedPreview.forEach((info, index) => {
        // 数据验证：确保 stockName 有效
        if (!info.stockName) {
          addLog(`[跳过] 第${index + 1}条记录缺少股票名称`, "warning", info);
          return;
        }

        // 标准化股票代码（去除空格，统一格式）
        let normalizedCode = info.stockCode?.trim().replace(/[^0-9]/g, '') || '';
        const normalizedName = info.stockName.trim();

        // 如果股票代码不是6位数字，使用"待补充_股票名"作为临时标识
        if (normalizedCode.length !== 6) {
          normalizedCode = `待补充_${normalizedName}`;
          addLog(`[提示] ${normalizedName} 的股票代码待补充，已使用临时标识`, "info");
        }

        let idx = newStocks.findIndex(s => s.code === normalizedCode);
        if (idx === -1) idx = newStocks.findIndex(s => s.name === normalizedName);

        const finalDate = info.date || manualImportDate || new Date().toLocaleDateString();
        // 生成唯一的记录ID
        const recordId = `rec_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`;
        const record: AnalysisRecord = {
          id: recordId,
          stockId: '',
          timestamp: new Date().toLocaleString(),
          customDate: finalDate,
          title: info.title || `${finalDate} 研报更新`,
          content: info.logic,
          logic: info.logic,
          dataPoints: info.dataPoints || [],
          rawText: info.logic
        };

        if (idx >= 0) {
          addLog(`[更新现有标的] ${newStocks[idx].name} (${newStocks[idx].code})`, "success");
          // 设置股票ID
          record.stockId = newStocks[idx].id;
          newStocks[idx] = {
            ...newStocks[idx],
            sector: info.sector || newStocks[idx].sector,
            concepts: [...new Set([...(info.concepts || []), ...newStocks[idx].concepts])],
            products: [...new Set([...(info.products || []), ...(newStocks[idx].products || [])])],
            targetValuation: info.targetValuation || newStocks[idx].targetValuation,
            earningsForecast: info.earningsForecast || newStocks[idx].earningsForecast,
            lastUpdated: new Date().toLocaleString(),
            records: [record, ...newStocks[idx].records]
          };
        } else {
          // 生成唯一的股票ID
          const newStockId = `s_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`;
          record.stockId = newStockId;
          addLog(`[新增资产标的] ${normalizedName} (${normalizedCode})`, "info");
          const newStock = {
            id: newStockId,
            name: normalizedName,
            code: normalizedCode,
            price: '---',
            dailyChange: '0%',
            marketCap: info.marketCap || '---',
            peRatio: info.peRatio || '---',
            revenue: '---',
            concepts: info.concepts || [],
            products: info.products || [],
            sector: info.sector || '未分类',
            targetValuation: info.targetValuation || '',
            earningsForecast: info.earningsForecast || '',
            lastUpdated: new Date().toLocaleString(),
            records: [record]
          };
          newStocks.push(newStock);
          console.log('新增股票:', newStock);
        }
      });
      return newStocks;
    });

    setImportText('');
    setExtractedPreview([]);
    setViewMode(ViewMode.DASHBOARD);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    // 导入完成后刷新所有股票的价格
    setTimeout(() => refreshPrices(), 500);
  };

  const refreshPrices = async (targetStocks?: Stock[]) => {
    // 优先使用传入的列表，否则使用当前状态
    const stocksToSync = targetStocks || stocks;

    if (isRefreshing || stocksToSync.length === 0) return;
    setIsRefreshing(true);
    addLog("后台正在同步实时行情...", "info");

    try {
      const priceUpdates = new Map<string, any>();

      // 并行请求优化可能更好，但为了稳健先保持串行或简单并行
      for (const stock of stocksToSync) {
        // 跳过没有有效代码的
        if (!stock.code || stock.code.startsWith('待补充')) continue;

        const data = await fetchStockPrice(stock.code);
        if (data) {
          priceUpdates.set(stock.code, data);
          addLog(`同步成功: ${stock.name} (${stock.code})`, "info");
        }
      }

      if (priceUpdates.size > 0) {
        setStocks(prev => prev.map(s => {
          const update = priceUpdates.get(s.code);
          if (update) {
            return {
              ...s,
              price: update.price,
              dailyChange: update.pct_chg,
              marketCap: update.marketCap,
              peRatio: update.peRatio,
              lastUpdated: new Date().toLocaleString()
            };
          }
          return s;
        }));
        addLog("行情全量同步完成", "success");
      } else {
        addLog("未获取到新的行情数据", "info");
      }
    } catch (e) {
      addLog("行情同步过程存在部分异常，请检查网络或 Token 额度", "warning");
    } finally {
      setIsRefreshing(false);
    }
  };

  const deleteStock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定删除该标的所有数据吗？此操作不可撤销。")) {
      setStocks(prev => prev.filter(s => s.id !== id));
      addLog("已删除标的及其所有研究记录", "warning", id);
      if (selectedStockId === id) {
        setViewMode(ViewMode.DASHBOARD);
        setSelectedStockId(null);
      }
    }
  };

  const deletePendingStocks = () => {
    // 统计待删除的股票数量
    const pendingStocks = stocks.filter(s => s.code.includes('待补充'));
    const pendingCount = pendingStocks.length;

    if (pendingCount === 0) {
      addLog("没有找到待补充的股票数据", "info");
      return;
    }

    if (window.confirm(`确定删除所有 ${pendingCount} 个待补充的股票数据吗？此操作不可撤销。`)) {
      const deletedIds = pendingStocks.map(s => s.id);
      setStocks(prev => prev.filter(s => !s.code.includes('待补充')));
      addLog(`已删除 ${pendingCount} 个待补充的股票数据`, "warning", deletedIds);

      // 如果当前选中的股票也被删除了，切换回仪表盘
      if (selectedStockId && deletedIds.includes(selectedStockId)) {
        setViewMode(ViewMode.DASHBOARD);
        setSelectedStockId(null);
      }
    }
  };

  // 显示历史数据
  const showHistoryData = () => {
    try {
      // 从 localStorage 中获取日期索引
      const dateIndex = JSON.parse(localStorage.getItem('stock_tracker_date_index') || '[]');

      if (dateIndex.length === 0) {
        addLog("没有找到历史数据", "info");
        return;
      }

      // 加载每个日期的股票数据
      const history = dateIndex.map((date: string) => {
        const data = localStorage.getItem(`stock_tracker_db_${date}`);
        if (data) {
          const parsedData = JSON.parse(data);
          return {
            date: date,
            stocks: parsedData.stocks || [],
            updatedAt: parsedData.updatedAt || ''
          };
        }
        return null;
      }).filter((item: any) => item !== null);

      setHistoryData(history);
      setIsHistoryOpen(true);
      addLog(`加载了 ${history.length} 条历史数据记录`, "info");
    } catch (error: any) {
      addLog(`加载历史数据失败: ${error.message}`, "error", error);
    }
  };

  // 恢复历史数据
  const restoreHistoryData = (date: string, stocks: Stock[]) => {
    if (window.confirm(`确定要恢复 ${date} 的数据吗？当前数据将会被覆盖。`)) {
      setStocks(stocks);
      setIsHistoryOpen(false);
      addLog(`已恢复 ${date} 的数据`, "success");
    }
  };

  // 导出历史数据
  const exportHistoryData = (date: string, stocks: Stock[]) => {
    const dataStr = JSON.stringify({
      date: date,
      stocks: stocks,
      exportedAt: new Date().toISOString()
    }, null, 2);

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-tracker-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);

    addLog(`已导出 ${date} 的数据`, "success");
  };

  // 处理产品点击事件，搜索相关个股
  const handleProductClick = (product: string) => {
    setSearchQuery(product);
    setViewMode(ViewMode.DASHBOARD);
    addLog(`正在搜索生产"${product}"的个股`, "info");
  };

  // 涨价监控处理函数
  const handlePriceMonitorImport = (newConcepts: PriceIncreaseConcept[]) => {
    setPriceMonitorConcepts(prev => [...prev, ...newConcepts]);
    addLog(`成功导入 ${newConcepts.length} 个涨价概念`, "success");
  };

  const handlePriceMonitorExport = () => {
    // 导出逻辑在 PriceMonitor 组件中处理
    addLog("导出涨价监控数据", "info");
  };

  const handlePriceMonitorDelete = (id: string) => {
    setPriceMonitorConcepts(prev => prev.filter(c => c.id !== id));
    addLog("已删除涨价概念", "success");
  };

  const handlePriceMonitorUpdate = (concept: PriceIncreaseConcept) => {
    setPriceMonitorConcepts(prev => {
      const idx = prev.findIndex(c => c.id === concept.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = concept;
        return updated;
      }
      return [...prev, concept];
    });
    addLog(`已${priceMonitorConcepts.find(c => c.id === concept.id) ? '更新' : '添加'}涨价概念: ${concept.name}`, "success");
  };

  // 手动保存数据
  const handleSave = async () => {
    try {
      // 保存到主数据库
      localStorage.setItem('stock_tracker_db_v4_final', JSON.stringify(stocks));

      // 保存到IndexedDB
      await saveToIndexedDb(stocks);

      // 保存到云端
      try {
        console.log('正在保存数据到云端...');
        await saveToCloud(stocks);
        addLog('数据已成功保存到云端', 'success');
      } catch (cloudError) {
        console.error('云端保存失败:', cloudError);
        addLog('云端保存失败，仅保存到本地', 'warning');
      }

      // 按日期保存数据
      const todayDate = getTodayDate();
      const todayStockData = {
        stocks: stocks,
        updatedAt: new Date().toISOString(),
        changes: stocks.length
      };
      localStorage.setItem(`stock_tracker_db_${todayDate}`, JSON.stringify(todayStockData));

      // 保存历史数据到IndexedDB
      await saveHistoryToIndexedDb(todayDate, todayStockData);

      // 保存日期索引
      const dateIndex = JSON.parse(localStorage.getItem('stock_tracker_date_index') || '[]');
      if (!dateIndex.includes(todayDate)) {
        dateIndex.push(todayDate);
        dateIndex.sort((a: string, b: string) => b.localeCompare(a));
        localStorage.setItem('stock_tracker_date_index', JSON.stringify(dateIndex));
      }

      // 生成带日期的备份文件
      const backupDataStr = JSON.stringify({
        stocks: stocks,
        exportedAt: new Date().toISOString(),
        date: todayDate
      }, null, 2);

      const backupDataBlob = new Blob([backupDataStr], { type: 'application/json' });
      const backupUrl = URL.createObjectURL(backupDataBlob);
      const backupLink = document.createElement('a');
      backupLink.href = backupUrl;
      backupLink.download = `stock-tracker-backup-${todayDate}.json`;
      backupLink.click();
      URL.revokeObjectURL(backupUrl);

      addLog(`数据保存成功并生成备份文件 (${todayDate})`, "success");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      addLog(`保存数据失败: ${error.message}`, "error", error);
    }
  };

  // 导出当前数据
  const exportCurrentData = () => {
    const dataStr = JSON.stringify({
      stocks: stocks,
      exportedAt: new Date().toISOString(),
      date: getTodayDate()
    }, null, 2);

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-tracker-${getTodayDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    addLog(`已导出当前数据 (${getTodayDate()})`, "success");
  };

  // 导入数据
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.stocks && Array.isArray(data.stocks)) {
          // 询问用户如何导入
          const mergeChoice = window.confirm(
            `发现 ${data.stocks.length} 条数据。\n\n点击"确定"将合并到现有数据（自动合并相同个股）\n点击"取消"将覆盖现有数据`
          );
          
          if (mergeChoice) {
            // 合并模式：按代码和名称合并相同个股
            const stockMap = new Map<string, Stock>();
            
            // 先添加现有股票
            stocks.forEach(stock => {
              const key = `${stock.code}_${stock.name}`;
              stockMap.set(key, { ...stock, records: [...(stock.records || [])] });
            });
            
            // 合并新股票
            data.stocks.forEach(newStock => {
              const key = `${newStock.code}_${newStock.name}`;
              
              if (stockMap.has(key)) {
                // 已存在，合并记录
                const existing = stockMap.get(key)!;
                const existingIds = new Set(existing.records?.map(r => r.id) || []);
                
                // 添加新记录
                const newRecords = (newStock.records || []).filter(r => !existingIds.has(r.id));
                if (newRecords.length > 0) {
                  existing.records = [...(existing.records || []), ...newRecords];
                }
                
                // 合并概念
                if (newStock.concepts && newStock.concepts.length > 0) {
                  const existingConcepts = new Set(existing.concepts || []);
                  newStock.concepts.forEach(c => existingConcepts.add(c));
                  existing.concepts = Array.from(existingConcepts);
                }
                
                // 合并主营产品
                if (newStock.products && newStock.products.length > 0) {
                  const existingProducts = new Set(existing.products || []);
                  newStock.products.forEach(p => existingProducts.add(p));
                  existing.products = Array.from(existingProducts);
                }
                
                // 更新其他字段（取非空值）
                const fields = ['sector', 'targetValuation', 'earningsForecast', 'price', 'marketCap', 'peRatio'];
                fields.forEach(field => {
                  if ((newStock as any)[field] && (newStock as any)[field] !== '---' && (newStock as any)[field] !== '' && (newStock as any)[field] !== '估值：-') {
                    (existing as any)[field] = (newStock as any)[field];
                  }
                });
              } else {
                // 不存在，直接添加，确保products字段存在
                const stockToAdd = {
                  ...newStock,
                  products: newStock.products || [],
                  records: [...(newStock.records || [])]
                };
                stockMap.set(key, stockToAdd);
              }
            });
            
            const mergedStocks = Array.from(stockMap.values());
            setStocks(mergedStocks);
            const duplicateCount = data.stocks.length + stocks.length - mergedStocks.length;
            addLog(`成功导入并合并 ${data.stocks.length} 条数据，合并了 ${duplicateCount} 条重复记录`, "success");
          } else {
            // 覆盖模式，确保每个股票都有products字段
            const stocksWithProducts = data.stocks.map((stock: any) => ({
              ...stock,
              products: stock.products || []
            }));
            setStocks(stocksWithProducts);
            addLog(`成功导入 ${data.stocks.length} 条数据（覆盖模式）`, "success");
          }
          
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          
          // 自动保存到云端
          setTimeout(async () => {
            try {
              console.log('正在自动保存导入的数据到云端...');
              await saveToCloud(stocks.length > 0 ? stocks : data.stocks);
              addLog('导入的数据已自动保存到云端', 'success');
            } catch (cloudError) {
              console.error('自动保存到云端失败:', cloudError);
              addLog('自动保存到云端失败，数据已保存到本地', 'warning');
            }
          }, 1000);
        } else if (Array.isArray(data)) {
          // 处理爬虫抓取的数组格式 -> 转入研报录入流程
          const extracted = parseLocalStockFile(text);
          if (extracted.length > 0) {
            setExtractedPreview(extracted);
            setViewMode(ViewMode.IMPORT);
            addLog(`识别到研报列表，已转入导入预览模式 (${extracted.length} 条)`, "info", extracted);
          } else {
            throw new Error("虽然是数组格式，但未识别到有效股票数据");
          }
        } else {
          throw new Error("文件格式不正确");
        }
      } catch (error: any) {
        addLog(`导入数据失败: ${error.message}`, "error", error);
      }
    };

    reader.readAsText(file, 'utf-8');
    // 清空input，允许重复导入同一文件
    e.target.value = '';
  };

  // 获取微信公众号研报数据
  const fetchWechatReports = async () => {
    setIsFetchingWechatReports(true);
    addLog("正在从微信公众号获取研报数据...", "info");
    
    try {
      const response = await fetch('/api/wechat-reports');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.reports && Array.isArray(data.reports)) {
        setWechatReports(data.reports);
        addLog(`成功获取 ${data.reports.length} 条微信公众号研报数据`, "success");
        setIsWechatReportsOpen(true);
      } else if (data.stocks && Array.isArray(data.stocks)) {
        // 兼容直接从云函数接收的数据格式
        const extractedData = data.stocks.map((stock: any) => ({
          stockName: stock.stockName || stock.name || '',
          stockCode: stock.stockCode || stock.code || '',
          title: stock.title || `${stock.date || new Date().toLocaleDateString()} 研报更新`,
          logic: stock.logic || stock.content || '',
          date: stock.date || '',
          sector: stock.sector || stock.concepts?.[0] || '',
          concepts: stock.concepts || [],
          products: stock.products || [],
          targetValuation: stock.targetValuation || '',
          dataPoints: stock.dataPoints || []
        })).filter((item: ExtractedInfo) => item.stockName);
        
        setWechatReports(extractedData);
        addLog(`成功获取 ${extractedData.length} 条微信公众号研报数据`, "success");
        setIsWechatReportsOpen(true);
      } else {
        throw new Error("未找到有效的研报数据");
      }
    } catch (error: any) {
      const errorMsg = error.message || "获取研报数据失败";
      addLog(`获取微信公众号研报数据失败: ${errorMsg}`, "error", error);
      setLastError(errorMsg);
    } finally {
      setIsFetchingWechatReports(false);
    }
  };

  // 获取JSON库数据
  const fetchJsonLibrary = async () => {
    setIsFetchingJsonLibrary(true);
    addLog("正在获取JSON库数据...", "info");
    
    try {
      // 获取统计信息
      const statsResponse = await fetch('http://localhost:3003/api/json-library?action=stats');
      if (!statsResponse.ok) {
        throw new Error(`HTTP error! status: ${statsResponse.status}`);
      }
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setJsonLibraryStats(statsData.stats);
        addLog(`JSON库统计: ${statsData.stats.total_articles} 篇文章`, "info");
      }
      
      // 获取所有文章
      const articlesResponse = await fetch('http://localhost:3003/api/json-library?action=articles');
      if (!articlesResponse.ok) {
        throw new Error(`HTTP error! status: ${articlesResponse.status}`);
      }
      const articlesData = await articlesResponse.json();
      
      if (articlesData.success) {
        setJsonLibraryArticles(articlesData.articles);
        addLog(`成功获取 ${articlesData.count} 篇JSON库文章`, "success");
        setJsonLibraryFilter('all');
        setJsonLibrarySearch('');
        setJsonLibrarySortBy('date');
        setJsonLibrarySortOrder('desc');
        setExpandedArticleId(null);
        setSelectedArticles(new Set());
        setIsJsonLibraryOpen(true);
      }
    } catch (error: any) {
      const errorMsg = error.message || "获取JSON库数据失败";
      addLog(`获取JSON库数据失败: ${errorMsg}`, "error", error);
      setLastError(errorMsg);
    } finally {
      setIsFetchingJsonLibrary(false);
    }
  };

  // 从JSON库导入到看板
  const importFromJsonLibrary = () => {
    if (selectedArticles.size === 0) {
      addLog("请先选择要导入的文章", "warning");
      return;
    }

    addLog(`开始从JSON库导入 ${selectedArticles.size} 篇文章到看板...`, "info");

    setStocks(prevStocks => {
      const newStocks = [...prevStocks];
      let importCount = 0;

      jsonLibraryArticles.forEach(article => {
        if (!selectedArticles.has(article.id)) return;

        const stockName = article.title || article.stock_name || '未知股票';
        const stockCode = article.code || '';
        const logic = article.description || article.logic?.概况 || '';
        const sector = article.source || '研报';

        let normalizedCode = stockCode?.trim().replace(/[^0-9]/g, '') || '';
        if (normalizedCode.length !== 6) {
          normalizedCode = `待补充_${stockName}`;
        }

        let idx = newStocks.findIndex(s => s.code === normalizedCode);
        if (idx === -1) idx = newStocks.findIndex(s => s.name === stockName);

        const record = {
          id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          stockId: '',
          timestamp: new Date().toLocaleString(),
          title: `【${article.source || '研报'}】${stockName}`,
          content: logic,
          logic: logic,
          dataPoints: [],
          rawText: article.description || JSON.stringify(article)
        };

        if (idx !== -1) {
          record.stockId = newStocks[idx].id;
          newStocks[idx] = {
            ...newStocks[idx],
            records: [record, ...newStocks[idx].records],
            lastUpdated: new Date().toLocaleString()
          };
          addLog(`[更新] ${stockName} 添加了新研报记录`, "success");
        } else {
          const newStockId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          record.stockId = newStockId;
          const newStock: Stock = {
            id: newStockId,
            name: stockName,
            code: normalizedCode,
            price: '---',
            dailyChange: '0%',
            marketCap: '---',
            peRatio: '---',
            revenue: '---',
            concepts: [],
            products: [],
            sector: sector,
            targetValuation: '',
            earningsForecast: '',
            lastUpdated: new Date().toLocaleString(),
            records: [record]
          };
          newStocks.unshift(newStock);
          addLog(`[新增] ${stockName} (${normalizedCode})`, "success");
        }
        importCount++;
      });

      addLog(`导入完成！共处理 ${importCount} 只股票`, "success", { importCount });
      return newStocks;
    });

    setSelectedArticles(new Set());
    setIsJsonLibraryOpen(false);
  };

  // 调试：检查currentStock的获取情况
  const currentStock = stocks.find(s => s.id === selectedStockId);
  console.log('currentStock:', currentStock, 'selectedStockId:', selectedStockId, 'stocks length:', stocks.length);
  if (selectedStockId && !currentStock) {
    console.log('无法找到股票:', selectedStockId);
    console.log('所有股票ID:', stocks.map(s => s.id));
  }

  // 编辑相关状态
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    code: string;
    sector: string;
    targetValuation: string;
    latestLogic: string;
    concepts: string[];
    products: string[];
  } | null>(null);

  const startEditing = () => {
    if (!currentStock) return;
    setEditForm({
      name: currentStock.name,
      code: currentStock.code,
      sector: currentStock.sector,
      targetValuation: currentStock.targetValuation || '',
      latestLogic: currentStock.records[0]?.logic || '',
      concepts: currentStock.concepts || [],
      products: currentStock.products || []
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (!currentStock || !editForm) return;

    setStocks(prev => prev.map(s => {
      if (s.id === currentStock.id) {
        const newRecords = [...s.records];
        if (newRecords.length > 0) {
          newRecords[0] = { ...newRecords[0], logic: editForm.latestLogic };
        } else {
          newRecords.push({
            id: `rec_${Date.now()}`,
            stockId: s.id,
            timestamp: new Date().toLocaleString(),
            title: '手动录入',
            content: editForm.latestLogic,
            logic: editForm.latestLogic,
            dataPoints: [],
            rawText: ''
          });
        }

        return {
          ...s,
          name: editForm.name,
          code: editForm.code,
          sector: editForm.sector,
          targetValuation: editForm.targetValuation,
          concepts: editForm.concepts,
          products: editForm.products,
          records: newRecords,
          lastUpdated: new Date().toLocaleString()
        };
      }
      return s;
    }));

    addLog(`手动更新标的信息: ${editForm.name}`, "success");
    setIsEditing(false);
    setEditForm(null);
  };

  // 4. 视图组件
  const renderDashboard = () => {
    if (isLoading) {
      return (
        <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
              <p className="text-slate-600 font-medium">正在加载数据...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: '库中个股', value: stocks.length, icon: Database, color: 'text-indigo-600' },
            { label: '投研轨迹', value: stocks.reduce((a, s) => a + s.records.length, 0), icon: History, color: 'text-emerald-600' },
            { label: '行业覆盖', value: new Set(stocks.map(s => s.sector)).size, icon: Layers, color: 'text-amber-600' },
            { label: '活跃资产', value: stocks.filter(s => s.records.length >= 2).length, icon: Activity, color: 'text-rose-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`p-3.5 rounded-xl bg-slate-50 ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 pt-4">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            个股投研看板 <ArrowUpRight className="w-5 h-5 text-indigo-500" />
          </h1>
          <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full lg:w-72 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                placeholder="搜索名称 / 代码 / 概念 / 行业..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => refreshPrices()} disabled={isRefreshing} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => handleSave()} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-emerald-600 font-bold text-sm shadow-lg shadow-emerald-100 transition-all active:scale-95">
              <Save className="w-4 h-4" /> 保存数据
            </button>
            <button onClick={() => exportCurrentData()} className="bg-blue-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-600 font-bold text-sm shadow-lg shadow-blue-100 transition-all active:scale-95">
              <Upload className="w-4 h-4" /> 导出数据
            </button>
            <label className="bg-purple-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-purple-600 font-bold text-sm shadow-lg shadow-purple-100 transition-all active:scale-95 cursor-pointer">
              <Upload className="w-4 h-4" /> 导入数据
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
            <button onClick={() => deletePendingStocks()} className="bg-amber-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-amber-600 font-bold text-sm shadow-lg shadow-amber-100 transition-all active:scale-95">
              <Trash2 className="w-4 h-4" /> 删除待补充
            </button>
            <button onClick={() => navigate('/import')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95">
              <FilePlus className="w-4 h-4" /> 研报录入
            </button>
            <button onClick={() => showHistoryData()} className="bg-slate-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95">
              <History className="w-4 h-4" /> 历史数据
            </button>
            <button onClick={fetchWechatReports} disabled={isFetchingWechatReports} className="bg-green-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-green-700 disabled:bg-slate-200 font-bold text-sm shadow-lg shadow-green-100 transition-all active:scale-95">
              <Rss className={`w-4 h-4 ${isFetchingWechatReports ? 'animate-spin' : ''}`} /> 微信研报
            </button>
            <button onClick={fetchJsonLibrary} disabled={isFetchingJsonLibrary} className="bg-purple-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-purple-700 disabled:bg-slate-200 font-bold text-sm shadow-lg shadow-purple-100 transition-all active:scale-95">
              <Database className={`w-4 h-4 ${isFetchingJsonLibrary ? 'animate-spin' : ''}`} /> JSON库
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">标的名称与代码</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">最新价格</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">涨幅</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">板块</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">估值指标</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">目标估值</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider">最后录入逻辑</th>
                  <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                      暂无标的数据，点击右上角录入第一份研报
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map(s => {
                    const isPos = String(s.dailyChange).includes('+');
                    return (
                      <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => {
                        console.log('点击股票:', s.id, s.name);
                        // 确保使用最新的stocks数组查找股票
                        const stock = stocks.find(stock => stock.id === s.id);
                        if (stock) {
                          console.log('找到股票:', stock);
                          setSelectedStockId(s.id);
                          setViewMode(ViewMode.DETAIL);
                          console.log('切换到详情视图');
                        } else {
                          console.log('未找到股票:', s.id);
                          console.log('所有股票:', stocks);
                        }
                      }}>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{s.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">{s.code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 font-mono font-black text-slate-700 text-base">{s.price}</td>
                        <td className={`px-6 py-6 font-mono font-black ${isPos ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {s.dailyChange}
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg uppercase border border-indigo-100">
                            {s.sector}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{s.marketCap}</span>
                            <span className="text-[10px] text-slate-400">PE(TTM): {s.peRatio}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-[11px] text-slate-600 font-medium line-clamp-2 max-w-[180px] leading-relaxed" title={s.targetValuation}>
                            {s.targetValuation || <span className="text-slate-300 italic">待录入</span>}
                          </p>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[280px] leading-relaxed">
                            {s.records[0]?.logic || '暂无详细逻辑'}
                          </p>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <button onClick={(e) => deleteStock(s.id, e)} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* 微信公众号研报数据模态框 */}
        {isWechatReportsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-xl">
                    <Rss className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">微信公众号研报数据</h3>
                </div>
                <button onClick={() => setIsWechatReportsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-6">
                {wechatReports.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">暂无微信公众号研报数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wechatReports.map((report, index) => (
                      <div key={index} className="border border-slate-100 rounded-2xl p-4 hover:border-green-200 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-slate-900">{report.stockName}</h4>
                            <p className="text-sm text-slate-400">{report.stockCode}</p>
                          </div>
                          <span className="text-xs font-bold bg-green-50 text-green-600 px-2 py-1 rounded-lg">
                            {report.sector || '未分类'}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-slate-700">{report.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{report.logic}</p>
                          {report.targetValuation && (
                            <p className="text-xs text-slate-600 font-medium">
                              目标估值: {report.targetValuation}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex gap-1">
                            {report.concepts.map((concept, i) => (
                              <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded">
                                {concept}
                              </span>
                            ))}
                          </div>
                          <button 
                            onClick={() => {
                              setExtractedPreview([report]);
                              setIsWechatReportsOpen(false);
                              setViewMode(ViewMode.IMPORT);
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors"
                          >
                            导入研报
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setExtractedPreview(wechatReports);
                    setIsWechatReportsOpen(false);
                    setViewMode(ViewMode.IMPORT);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 font-bold text-sm transition-colors"
                >
                  全部导入
                </button>
                <button 
                  onClick={() => setIsWechatReportsOpen(false)}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-300 font-bold text-sm transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JSON库数据模态框 */}
        {isJsonLibraryOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-xl">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">JSON库数据</h3>
                  {jsonLibraryStats && (
                    <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">
                      {jsonLibraryStats.total_articles} 篇
                    </span>
                  )}
                </div>
                <button onClick={() => setIsJsonLibraryOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* 过滤和搜索工具栏 */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4">
                {/* 来源过滤 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">来源:</span>
                  <select 
                    value={jsonLibraryFilter}
                    onChange={(e) => setJsonLibraryFilter(e.target.value)}
                    className="text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="all">全部来源</option>
                    {[...new Set(jsonLibraryArticles.map(a => a.source))].map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                
                {/* 关键词搜索 */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索标题或内容..."
                    value={jsonLibrarySearch}
                    onChange={(e) => setJsonLibrarySearch(e.target.value)}
                    className="flex-1 text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                
                {/* 排序 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">排序:</span>
                  <select 
                    value={jsonLibrarySortBy}
                    onChange={(e) => setJsonLibrarySortBy(e.target.value)}
                    className="text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="date">按日期</option>
                    <option value="title">按名称</option>
                    <option value="source">按来源</option>
                  </select>
                  <button 
                    onClick={() => setJsonLibrarySortOrder(jsonLibrarySortOrder === 'desc' ? 'asc' : 'desc')}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    {jsonLibrarySortOrder === 'desc' ? (
                      <ArrowDown className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* 文章列表 */}
              <div className="overflow-y-auto flex-1 p-6">
                {(() => {
                  // 过滤
                  let filteredArticles = jsonLibraryArticles;
                  if (jsonLibraryFilter !== 'all') {
                    filteredArticles = filteredArticles.filter(a => a.source === jsonLibraryFilter);
                  }
                  // 搜索
                  if (jsonLibrarySearch) {
                    const searchLower = jsonLibrarySearch.toLowerCase();
                    filteredArticles = filteredArticles.filter(a => 
                      a.title?.toLowerCase().includes(searchLower) || 
                      a.description?.toLowerCase().includes(searchLower)
                    );
                  }
                  // 排序
                  filteredArticles = [...filteredArticles].sort((a, b) => {
                    let comparison = 0;
                    if (jsonLibrarySortBy === 'date') {
                      comparison = new Date(a.fetch_time).getTime() - new Date(b.fetch_time).getTime();
                    } else if (jsonLibrarySortBy === 'title') {
                      comparison = (a.title || '').localeCompare(b.title || '');
                    } else if (jsonLibrarySortBy === 'source') {
                      comparison = (a.source || '').localeCompare(b.source || '');
                    }
                    return jsonLibrarySortOrder === 'desc' ? -comparison : comparison;
                  });
                  
                  if (filteredArticles.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">暂无匹配的JSON库数据</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {filteredArticles.map((article, index) => {
                        const articleId = article.title + '_' + index;
                        const isExpanded = expandedArticleId === articleId;
                        const isSelected = selectedArticles.has(articleId);
                        return (
                          <div 
                            key={index} 
                            className={`border rounded-2xl transition-all cursor-pointer ${
                              isExpanded 
                                ? 'border-purple-300 bg-purple-50' 
                                : isSelected
                                ? 'border-purple-400 bg-purple-25'
                                : 'border-slate-100 hover:border-purple-200 bg-white'
                            }`}
                            onClick={() => setExpandedArticleId(isExpanded ? null : articleId)}
                          >
                            <div className="p-4">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newSelected = new Set(selectedArticles);
                                      if (e.target.checked) {
                                        newSelected.add(articleId);
                                      } else {
                                        newSelected.delete(articleId);
                                      }
                                      setSelectedArticles(newSelected);
                                    }}
                                    className="mt-1 w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                        {article.source}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {new Date(article.fetch_time).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <h4 className="font-black text-slate-900 mt-2">{article.title}</h4>
                                  </div>
                                  <p className={`text-sm text-slate-500 mt-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {article.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ArrowUp className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <ArrowDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </div>
                              
                              {/* 展开详情 */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-purple-200">
                                  <div className="bg-white rounded-xl p-4">
                                    <h5 className="text-xs font-bold text-slate-500 mb-2">文章全文</h5>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{article.description}</p>
                                    
                                    <div className="mt-4 flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500">引自:</span>
                                        <span className="text-xs font-bold text-purple-600">{article.source}</span>
                                      </div>
                                      <a 
                                        href={article.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        查看原文
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              
              {/* 底部操作栏 */}
              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-slate-500">
                    共 {jsonLibraryArticles.length} 篇文章，已选 {selectedArticles.size} 篇
                  </p>
                  <button
                    onClick={() => {
                      if (selectedArticles.size === filteredArticles.length) {
                        setSelectedArticles(new Set());
                      } else {
                        const allIds = new Set(filteredArticles.map((a, i) => a.title + '_' + i));
                        setSelectedArticles(allIds);
                      }
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold"
                  >
                    {selectedArticles.size === filteredArticles.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={importFromJsonLibrary}
                    disabled={selectedArticles.size === 0}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                      selectedArticles.size === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    导入到看板 ({selectedArticles.size})
                  </button>
                  <button 
                    onClick={() => setIsJsonLibraryOpen(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-300 font-bold text-sm transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderImport = () => (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center text-slate-500 hover:text-indigo-600 gap-1 font-bold transition-colors">
          <ChevronLeft className="w-5 h-5" /> 取消并返回看板
        </button>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <input
            className="text-sm font-bold bg-transparent outline-none w-40 text-slate-700"
            placeholder="研报发布日期"
            value={manualImportDate}
            onChange={e => setManualImportDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
          <TrendingUp className="w-64 h-64 text-indigo-900" />
        </div>

        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl"><Layers className="w-6 h-6 text-indigo-600" /></div>
            AI 研报结构化引擎
          </h2>
          <p className="text-slate-400 text-sm font-medium pl-12">粘贴原始研报文本，我们将自动识别个股、逻辑、估值及行业分类。</p>
        </div>

        <div className="space-y-4">
          <textarea
            className="w-full h-80 p-8 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium leading-relaxed transition-all shadow-inner"
            placeholder="示例：&#10;2025.01.06 ⭕【宁德时代】逻辑：全球动力电池龙头，储能业务高速增长，预计PE 25倍。&#10;..."
            value={importText}
            onChange={e => setImportText(e.target.value)}
          />
          <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50/50">
            <input
              type="file"
              accept=".txt,.md,.json"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer flex flex-col items-center justify-center gap-4 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="p-6 bg-indigo-50 rounded-full">
                <Upload className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-900">上传本地研报文件</h4>
                <p className="text-sm text-slate-400 font-medium">支持 .txt、.md、.json 格式文件</p>
                <p className="text-xs text-slate-300">拖拽文件到此处或点击选择文件</p>
              </div>
              <div className={`mt-2 px-6 py-3 rounded-xl font-bold text-sm ${isUploading ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> 正在解析文件...
                  </span>
                ) : (
                  '选择文件'
                )}
              </div>
            </label>
          </div>
          {lastError && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100 animate-in shake duration-300">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wide">{lastError}</p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              disabled={isExtracting || !importText.trim()}
              onClick={handleExtract}
              className="bg-indigo-600 text-white px-12 py-4 rounded-2xl flex items-center gap-3 hover:bg-indigo-700 disabled:bg-slate-200 font-black shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
              {isExtracting ? '正在深度解析数据...' : '开始结构化解析'}
            </button>
          </div>
        </div>
      </div>

      {extractedPreview.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl flex justify-between items-center">
            <div className="space-y-1">
              <p className="font-black text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                解析完成：识别到 {extractedPreview.length} 条记录
              </p>
              <p className="text-xs text-slate-400 font-medium">请核对下方卡片信息，确认无误后点击右侧按钮合并入库。</p>
            </div>
            <button
              onClick={confirmImport}
              className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
            >
              确认合并入库
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {extractedPreview.map((info, i) => (
              <div key={i} className={`bg-white p-8 rounded-3xl border shadow-sm space-y-4 group hover:border-indigo-300 transition-all ${!info.stockCode || !info.stockName ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full">#{i + 1}</span>
                      <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">{info.date || manualImportDate || 'NEW'}</span>
                      <h4 className={`text-lg font-black ${!info.stockName ? 'text-rose-500' : 'text-slate-900'}`}>
                        {info.stockName || '未识别名称'}
                      </h4>
                    </div>
                    <span className={`font-mono text-[10px] font-bold ${!info.stockCode ? 'text-rose-400' : 'text-slate-400'}`}>
                      {info.stockCode || '未识别代码'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 uppercase">{info.sector || '未分类'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4 font-medium italic">"{info.logic}"</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {info.concepts && info.concepts.map(c => <span key={c} className="text-[9px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-lg">#{c}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    console.log('渲染详情页面，currentStock:', currentStock);
    if (!currentStock) {
      console.log('currentStock为null，无法渲染详情页面');
      return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-500 pb-40">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center text-slate-500 hover:text-indigo-600 gap-1 font-bold transition-colors">
              <ChevronLeft className="w-5 h-5" /> 返回资产看板
            </button>
          </div>
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-10">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <h2 className="text-2xl font-black text-slate-900">无法加载股票详情</h2>
              <p className="text-slate-400">所选股票数据可能已被删除或不存在。</p>
              <button
                onClick={() => navigate('/')}
                className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                返回资产看板
              </button>
            </div>
          </div>
        </div>
      );
    }
    const isPos = String(currentStock.dailyChange).includes('+');

    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-10 animate-in fade-in duration-500 pb-40">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center text-slate-500 hover:text-indigo-600 gap-1 font-bold transition-colors">
            <ChevronLeft className="w-5 h-5" /> 返回资产看板
          </button>

          <div className="flex items-center gap-4">
            {!isEditing ? (
              <>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
                  Last Sync: {currentStock.lastUpdated}
                </div>
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  <Edit3 className="w-4 h-4" /> 编辑信息
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4" /> 取消
                </button>
                <button
                  onClick={saveEditing}
                  className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100"
                >
                  <Save className="w-4 h-4" /> 保存修改
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-10 sticky top-28">

              <div className="space-y-4">
                {isEditing && editForm ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">标的名称</label>
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-indigo-500 outline-none bg-transparent py-1 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">代码</label>
                        <input
                          value={editForm.code}
                          onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                          className="w-full font-mono font-bold text-slate-600 border-b-2 border-slate-100 focus:border-indigo-500 outline-none bg-transparent py-1 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">板块</label>
                        <input
                          value={editForm.sector}
                          onChange={e => setEditForm({ ...editForm, sector: e.target.value })}
                          className="w-full font-bold text-indigo-600 border-b-2 border-slate-100 focus:border-indigo-500 outline-none bg-transparent py-1 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">{currentStock.name}</h2>
                      <div className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">{currentStock.sector}</div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-slate-400 font-bold">
                      <span>{currentStock.code}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                      <span className="text-[10px] uppercase tracking-tighter">Listed in CN</span>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                  {isEditing && <div className="absolute inset-0 bg-slate-100/50 flex items-center justify-center backdrop-blur-[1px] z-10"><span className="text-[10px] font-black text-slate-400 uppercase bg-white px-2 py-1 rounded-lg">Read Only</span></div>}
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Market Price</p>
                  <p className={`text-3xl font-black ${isPos ? 'text-rose-500' : 'text-emerald-600'}`}>{currentStock.price}</p>
                  <p className={`text-xs font-bold mt-1 ${isPos ? 'text-rose-500' : 'text-emerald-600'}`}>{currentStock.dailyChange}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                  {isEditing && <div className="absolute inset-0 bg-slate-100/50 flex items-center justify-center backdrop-blur-[1px] z-10"><span className="text-[10px] font-black text-slate-400 uppercase bg-white px-2 py-1 rounded-lg">Read Only</span></div>}
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valuation</p>
                  <p className="text-2xl font-black text-slate-900">{currentStock.marketCap}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">PE: {currentStock.peRatio}</p>
                </div>
              </div>

              <div className="space-y-8 pt-4">
                <div className="space-y-3">
                  <span className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <Target className="w-4 h-4 text-indigo-500" /> Target Valuation
                  </span>
                  {isEditing && editForm ? (
                    <textarea
                      value={editForm.targetValuation}
                      onChange={e => setEditForm({ ...editForm, targetValuation: e.target.value })}
                      className="w-full h-32 text-sm text-slate-600 leading-relaxed font-medium bg-white p-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                      placeholder="输入目标估值分析..."
                    />
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-indigo-50/20 p-6 rounded-[2rem] border border-indigo-50 italic">
                      {currentStock.targetValuation || '暂无目标估值与业绩预测数据，点击编辑进行录入。'}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <span className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <Tag className="w-4 h-4 text-indigo-500" /> Alpha Concepts
                  </span>
                  {isEditing && editForm ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="添加新概念"
                          className="flex-1 text-sm text-slate-600 font-medium bg-white p-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              setEditForm({
                                ...editForm,
                                concepts: [...editForm.concepts, e.currentTarget.value.trim()]
                              });
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editForm.concepts.map((c, index) => (
                          <span key={index} className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform flex items-center gap-1">
                            #{c}
                            <button
                              onClick={() => {
                                const newConcepts = [...editForm.concepts];
                                newConcepts.splice(index, 1);
                                setEditForm({ ...editForm, concepts: newConcepts });
                              }}
                              className="w-3 h-3 text-rose-500 hover:text-rose-600 transition-colors"
                            >×</button>
                          </span>
                        ))}
                        {editForm.concepts.length === 0 && (
                          <span className="text-slate-300 text-xs italic font-medium">未定义概念</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {currentStock.concepts && currentStock.concepts.length > 0 ? currentStock.concepts.map(c => (
                        <span key={c} className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform cursor-default">#{c}</span>
                      )) : <span className="text-slate-300 text-xs italic font-medium">未定义概念</span>}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <span className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <Package className="w-4 h-4 text-emerald-500" /> 主营产品
                  </span>
                  {isEditing && editForm ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="添加新产品"
                          className="flex-1 text-sm text-slate-600 font-medium bg-white p-3 rounded-xl border-2 border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              setEditForm({
                                ...editForm,
                                products: [...editForm.products, e.currentTarget.value.trim()]
                              });
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editForm.products.map((p, index) => (
                          <span key={index} className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-100 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform flex items-center gap-1">
                            {p}
                            <button
                              onClick={() => {
                                const newProducts = [...editForm.products];
                                newProducts.splice(index, 1);
                                setEditForm({ ...editForm, products: newProducts });
                              }}
                              className="w-3 h-3 text-rose-500 hover:text-rose-600 transition-colors"
                            >×</button>
                          </span>
                        ))}
                        {editForm.products.length === 0 && (
                          <span className="text-slate-300 text-xs italic font-medium">未定义主营产品</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {currentStock.products && currentStock.products.length > 0 ? currentStock.products.map(p => (
                        <span 
                          key={p} 
                          className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-100 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform cursor-pointer hover:bg-emerald-50"
                          onClick={() => handleProductClick(p)}
                        >{p}</span>
                      )) : <span className="text-slate-300 text-xs italic font-medium">未定义主营产品</span>}
                    </div>
                  )}
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={(e) => deleteStock(currentStock.id, e)}
                  className="w-full py-4 text-slate-300 hover:text-rose-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-50 rounded-2xl transition-all"
                >
                  <Trash2 className="w-4 h-4" /> 销毁该个股数据资产
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <History className="w-6 h-6 text-indigo-600" /> 投研更新轨迹
              </h3>
              <span className="text-xs text-slate-400 font-black bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-inner">
                TOTAL {currentStock.records.length} ENTRIES
              </span>
            </div>

            {isEditing && editForm ? (
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-500/20 shadow-xl space-y-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-lg uppercase">Editing Latest Logic</span>
                </div>
                <textarea
                  value={editForm.latestLogic}
                  onChange={e => setEditForm({ ...editForm, latestLogic: e.target.value })}
                  className="w-full h-96 text-base text-slate-700 leading-relaxed font-medium bg-slate-50 p-6 rounded-3xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all"
                  placeholder="编辑最新的研报逻辑..."
                />
              </div>
            ) : (
              <div className="space-y-8 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[3px] before:bg-slate-100">
                {currentStock.records.map((record) => (
                  <div key={record.id} className="relative pl-14 group">
                    <div className="absolute left-0 top-4 w-10 h-10 bg-white border-4 border-slate-50 rounded-full flex items-center justify-center z-10 group-hover:border-indigo-600 group-hover:bg-indigo-50 transition-all duration-500 shadow-sm">
                      <Quote className="w-4 h-4 text-slate-200 group-hover:text-indigo-600" />
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-50">
                        <div>
                          <h4 className="font-black text-slate-900 text-xl mb-2">{record.title}</h4>
                          <div className="flex items-center gap-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                              <Calendar className="w-4 h-4" /> {record.customDate}
                            </span>
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4" /> Sync: {record.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-base text-slate-600 leading-[1.8] font-medium whitespace-pre-wrap">
                        {record.logic}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 bg-slate-50/50">
      <nav className="h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100 sticky top-0 z-[60] shadow-sm">
        <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-11 h-11 bg-indigo-600 rounded-[1rem] flex items-center justify-center shadow-xl shadow-indigo-100 group-hover:scale-105 transition-all group-hover:rotate-3">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-slate-900 text-xl tracking-tighter uppercase italic">ALPHA<span className="text-indigo-600">RESEARCH</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/price-monitor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
                viewMode === ViewMode.PRICE_MONITOR
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <PriceIcon className="w-4 h-4" /> 涨价监控
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Engine Active</span>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {viewMode === ViewMode.DASHBOARD && renderDashboard()}
        {viewMode === ViewMode.IMPORT && renderImport()}
        {viewMode === ViewMode.DETAIL && renderDetail()}
        {viewMode === ViewMode.PRICE_MONITOR && (
          <PriceMonitor
            concepts={priceMonitorConcepts}
            onImport={handlePriceMonitorImport}
            onExport={handlePriceMonitorExport}
            onDelete={handlePriceMonitorDelete}
            onUpdate={handlePriceMonitorUpdate}
          />
        )}
      </main>

      {/* 提示组件 */}
      {showToast && (
        <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">资产库更新成功</span>
          </div>
        </div>
      )}

      {/* 诊断控制台 */}
      <div className={`fixed bottom-0 right-8 w-[450px] bg-white border border-slate-200 rounded-t-[2rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 z-[100] overflow-hidden ${isLogOpen ? 'h-[500px]' : 'h-14'}`}>
        <div
          className="h-14 px-8 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsLogOpen(!isLogOpen)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${isLogOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Terminal className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">诊断中心</span>
            <span className="bg-slate-100 text-[10px] text-slate-500 px-2 py-0.5 rounded-full font-bold">{logs.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
              <Trash className="w-4 h-4" />
            </button>
            {isLogOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
          </div>
        </div>

        {isLogOpen && (
          <div className="p-6 h-[444px] overflow-y-auto bg-slate-900 text-[11px] font-mono scroll-smooth hide-scrollbar selection:bg-indigo-500 selection:text-white">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <Activity className="w-12 h-12 opacity-10 animate-pulse" />
                <p className="italic font-medium text-center">系统运行良好，暂无诊断日志</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="border-b border-slate-800 pb-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-slate-500 font-bold opacity-50">[{log.time}]</span>
                      <span className={`font-black px-2 py-0.5 rounded text-[9px] uppercase ${log.type === 'success' ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-900/50' :
                          log.type === 'error' ? 'text-rose-400 bg-rose-900/30 border border-rose-900/50' :
                            log.type === 'warning' ? 'text-amber-400 bg-amber-900/30 border border-amber-900/50' :
                              'text-indigo-400 bg-indigo-900/30 border border-indigo-900/50'
                        }`}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed break-words">{log.message}</p>
                    {log.detail && (
                      <div className="mt-2 p-2 bg-black/40 rounded border border-slate-800/50 text-slate-500 text-[10px] overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.detail, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 历史数据对话框 */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                历史数据管理
              </h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {historyData.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">暂无历史数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyData.map((item, index) => (
                    <div key={index} className="bg-slate-50 rounded-2xl border border-slate-100 p-6 hover:border-indigo-300 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-slate-900 text-lg flex items-center gap-2">
                            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.date}</span>
                            {item.date === getTodayDate() && <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">今天</span>}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">
                            最后更新: {new Date(item.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2">
                          <p className="text-sm font-bold text-slate-700">{item.stocks.length} 个标的</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="bg-white rounded-xl border border-slate-100 p-3">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">标的名称</p>
                          <div className="flex flex-wrap gap-1">
                            {item.stocks.slice(0, 6).map((stock, stockIndex) => (
                              <span key={stockIndex} className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                                {stock.name}
                              </span>
                            ))}
                            {item.stocks.length > 6 && (
                              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                                +{item.stocks.length - 6} 个
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-100 p-3">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">行业分布</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(item.stocks.map((stock) => stock.sector))).slice(0, 6).map((sector, sectorIndex) => (
                              <span key={sectorIndex} className="text-xs font-medium bg-amber-50 text-amber-600 px-2 py-1 rounded-full">
                                {sector}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => exportHistoryData(item.date, item.stocks)}
                          className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          导出数据
                        </button>
                        <button
                          onClick={() => restoreHistoryData(item.date, item.stocks)}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          恢复数据
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
