
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Upload
} from 'lucide-react';
import type { Stock, AnalysisRecord, ExtractedInfo } from './types/index';
import { ViewMode } from './types/index';
import { extractStockInfoFromText } from './geminiService';
import { fetchStockPrice } from './tushareService';
import { parseLocalStockFile } from './localFileParser';

interface SystemLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  detail?: any;
}

const App: React.FC = () => {
  // 1. 状态管理
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const saved = localStorage.getItem('stock_tracker_db_v4_final');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [importText, setImportText] = useState('');
  const [manualImportDate, setManualImportDate] = useState(''); 
  const [extractedPreview, setExtractedPreview] = useState<ExtractedInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 日志系统
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

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
    localStorage.setItem('stock_tracker_db_v4_final', JSON.stringify(stocks));
  }, [stocks]);

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
      s.concepts.some(c => c.toLowerCase().includes(q))
    );
  }, [stocks, searchQuery]);

  const handleExtract = async () => {
    if (!importText.trim()) return;
    setIsExtracting(true);
    setExtractedPreview([]); 
    setLastError(null);
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
            products: [],
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
  } | null>(null);

  const startEditing = () => {
    if (!currentStock) return;
    setEditForm({
      name: currentStock.name,
      code: currentStock.code,
      sector: currentStock.sector,
      targetValuation: currentStock.targetValuation || '',
      latestLogic: currentStock.records[0]?.logic || ''
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
  const renderDashboard = () => (
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
        <div className="flex items-center gap-3 w-full lg:w-auto">
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
          <button onClick={() => deletePendingStocks()} className="bg-amber-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-amber-600 font-bold text-sm shadow-lg shadow-amber-100 transition-all active:scale-95">
            <Trash2 className="w-4 h-4" /> 删除待补充
          </button>
          <button onClick={() => setViewMode(ViewMode.IMPORT)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95">
            <FilePlus className="w-4 h-4" /> 研报录入
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
    </div>
  );

  const renderImport = () => (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="flex items-center text-slate-500 hover:text-indigo-600 gap-1 font-bold transition-colors">
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
              accept=".txt,.md"
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
                <p className="text-sm text-slate-400 font-medium">支持 .txt 格式文件</p>
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
            <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="flex items-center text-slate-500 hover:text-indigo-600 gap-1 font-bold transition-colors">
              <ChevronLeft className="w-5 h-5" /> 返回资产看板
            </button>
          </div>
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-10">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <h2 className="text-2xl font-black text-slate-900">无法加载股票详情</h2>
              <p className="text-slate-400">所选股票数据可能已被删除或不存在。</p>
              <button 
                onClick={() => setViewMode(ViewMode.DASHBOARD)}
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
          <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="flex items-center text-slate-500 hover:text-indigo-600 gap-1 font-bold transition-colors">
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
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-indigo-500 outline-none bg-transparent py-1 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">代码</label>
                          <input 
                            value={editForm.code}
                            onChange={e => setEditForm({...editForm, code: e.target.value})}
                            className="w-full font-mono font-bold text-slate-600 border-b-2 border-slate-100 focus:border-indigo-500 outline-none bg-transparent py-1 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">板块</label>
                          <input 
                            value={editForm.sector}
                            onChange={e => setEditForm({...editForm, sector: e.target.value})}
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
                        onChange={e => setEditForm({...editForm, targetValuation: e.target.value})}
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
                    <div className="flex flex-wrap gap-2">
                       {currentStock.concepts && currentStock.concepts.length > 0 ? currentStock.concepts.map(c => (
                          <span key={c} className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform cursor-default">#{c}</span>
                       )) : <span className="text-slate-300 text-xs italic font-medium">未定义概念</span>}
                    </div>
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
                      onChange={e => setEditForm({...editForm, latestLogic: e.target.value})}
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
           <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewMode(ViewMode.DASHBOARD)}>
              <div className="w-11 h-11 bg-indigo-600 rounded-[1rem] flex items-center justify-center shadow-xl shadow-indigo-100 group-hover:scale-105 transition-all group-hover:rotate-3">
                 <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-slate-900 text-xl tracking-tighter uppercase italic">ALPHA<span className="text-indigo-600">RESEARCH</span></span>
           </div>
           <div className="flex items-center gap-3">
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
                        <span className={`font-black px-2 py-0.5 rounded text-[9px] uppercase ${
                          log.type === 'success' ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-900/50' :
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
    </div>
  );
};

export default App;
