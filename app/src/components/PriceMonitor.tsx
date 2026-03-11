import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Calendar,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Search,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  AlertCircle,
  Activity,
  BarChart3,
  ArrowUpRight,
  Layers,
  Target
} from 'lucide-react';
import type { PriceIncreaseConcept, PriceCycle, RelatedStock, PriceMonitorImportData } from '../types/priceMonitor';

interface PriceMonitorProps {
  concepts: PriceIncreaseConcept[];
  onImport: (data: PriceIncreaseConcept[]) => void;
  onExport: () => void;
  onDelete: (id: string) => void;
  onUpdate: (concept: PriceIncreaseConcept) => void;
}

const PriceMonitor: React.FC<PriceMonitorProps> = ({
  concepts,
  onImport,
  onExport,
  onDelete,
  onUpdate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedConceptId, setExpandedConceptId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingConcept, setEditingConcept] = useState<PriceIncreaseConcept | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // 获取所有分类
  const categories = useMemo(() => {
    const cats = new Set(concepts.map(c => c.category));
    return Array.from(cats);
  }, [concepts]);

  // 过滤概念
  const filteredConcepts = useMemo(() => {
    return concepts.filter(concept => {
      const matchesSearch = concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concept.relatedStocks.some(s => s.stockName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || concept.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || concept.cycleInfo.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [concepts, searchQuery, selectedCategory, selectedStatus]);

  // 获取状态标签样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ended':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'paused':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing': return '进行中';
      case 'ended': return '已结束';
      case 'paused': return '暂停';
      default: return status;
    }
  };

  // 获取影响程度样式
  const getImpactStyle = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  // 处理导入
  const handleImport = () => {
    try {
      const data: PriceMonitorImportData = JSON.parse(importText);
      const newConcepts: PriceIncreaseConcept[] = data.concepts.map(c => ({
        id: `concept_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: c.name,
        category: c.category || '未分类',
        cycleInfo: {
          cycleName: c.cycleName,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status,
          priceChange: c.priceChange,
          driverFactors: c.driverFactors || [],
          marketImpact: c.marketImpact || ''
        },
        relatedStocks: c.relatedStocks.map(s => ({
          stockId: `stock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          stockName: s.stockName,
          stockCode: s.stockCode,
          relationType: s.relationType || '相关',
          impactLevel: s.impactLevel || 'medium',
          businessRelevance: s.businessRelevance || ''
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: c.notes
      }));
      onImport(newConcepts);
      setIsImportModalOpen(false);
      setImportText('');
    } catch (error) {
      alert('导入失败，请检查JSON格式是否正确');
    }
  };

  // 处理导出
  const handleExport = () => {
    const exportData: PriceMonitorImportData = {
      concepts: concepts.map(c => ({
        name: c.name,
        category: c.category,
        cycleName: c.cycleInfo.cycleName,
        startDate: c.cycleInfo.startDate,
        endDate: c.cycleInfo.endDate,
        status: c.cycleInfo.status,
        priceChange: c.cycleInfo.priceChange,
        driverFactors: c.cycleInfo.driverFactors,
        marketImpact: c.cycleInfo.marketImpact,
        relatedStocks: c.relatedStocks.map(s => ({
          stockName: s.stockName,
          stockCode: s.stockCode,
          relationType: s.relationType,
          impactLevel: s.impactLevel,
          businessRelevance: s.businessRelevance
        })),
        notes: c.notes
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `price-monitor-concepts-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 创建新概念
  const handleCreateNew = () => {
    const newConcept: PriceIncreaseConcept = {
      id: `concept_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      category: '原材料',
      cycleInfo: {
        cycleName: '',
        status: 'ongoing',
        priceChange: '',
        driverFactors: [],
        marketImpact: ''
      },
      relatedStocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingConcept(newConcept);
    setIsAddingNew(true);
  };

  // 保存概念
  const handleSaveConcept = () => {
    if (editingConcept) {
      onUpdate({
        ...editingConcept,
        updatedAt: new Date().toISOString()
      });
      setEditingConcept(null);
      setIsAddingNew(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">涨价监控</h1>
                <p className="text-xs text-slate-500 font-medium">Price Increase Monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                <Upload className="w-4 h-4" /> 导入
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                <Download className="w-4 h-4" /> 导出
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
              >
                <Plus className="w-4 h-4" /> 新增概念
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索概念或股票..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="all">所有分类</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="all">所有状态</option>
              <option value="ongoing">进行中</option>
              <option value="ended">已结束</option>
              <option value="paused">暂停</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-500 uppercase">总概念数</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{concepts.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-500 uppercase">进行中</span>
            </div>
            <p className="text-2xl font-black text-emerald-600">
              {concepts.filter(c => c.cycleInfo.status === 'ongoing').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-500 uppercase">相关股票</span>
            </div>
            <p className="text-2xl font-black text-blue-600">
              {concepts.reduce((acc, c) => acc + c.relatedStocks.length, 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-slate-500 uppercase">平均涨幅</span>
            </div>
            <p className="text-2xl font-black text-orange-600">
              {concepts.length > 0
                ? `+${Math.round(concepts.reduce((acc, c) => acc + parseFloat(c.cycleInfo.priceChange || '0'), 0) / concepts.length)}%`
                : '0%'}
            </p>
          </div>
        </div>

        {/* Concepts List */}
        <div className="space-y-4">
          {filteredConcepts.map(concept => (
            <div
              key={concept.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Concept Header */}
              <div
                className="p-6 cursor-pointer"
                onClick={() => setExpandedConceptId(expandedConceptId === concept.id ? null : concept.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 mb-1">{concept.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                          {concept.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${getStatusStyle(concept.cycleInfo.status)}`}>
                          {getStatusText(concept.cycleInfo.status)}
                        </span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold">
                          {concept.cycleInfo.priceChange}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConcept(concept);
                        setIsAddingNew(false);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这个概念吗？')) {
                          onDelete(concept.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedConceptId === concept.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Quick Info */}
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">{concept.cycleInfo.cycleName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">
                      {concept.cycleInfo.startDate ? new Date(concept.cycleInfo.startDate).toLocaleDateString('zh-CN') : '未开始'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Target className="w-4 h-4" />
                    <span className="font-medium">{concept.relatedStocks.length} 只相关股票</span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedConceptId === concept.id && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {/* Driver Factors */}
                  <div className="mb-6">
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" /> 涨价驱动因素
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {concept.cycleInfo.driverFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Market Impact */}
                  {concept.cycleInfo.marketImpact && (
                    <div className="mb-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> 市场影响
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
                        {concept.cycleInfo.marketImpact}
                      </p>
                    </div>
                  )}

                  {/* Related Stocks */}
                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4" /> 相关概念股
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {concept.relatedStocks.map(stock => (
                        <div
                          key={stock.stockId}
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-slate-900">{stock.stockName}</h5>
                            <span className="text-xs font-mono text-slate-500">{stock.stockCode}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${getImpactStyle(stock.impactLevel)}`}>
                              {stock.impactLevel === 'high' ? '高影响' : stock.impactLevel === 'medium' ? '中影响' : '低影响'}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                              {stock.relationType}
                            </span>
                          </div>
                          {stock.businessRelevance && (
                            <p className="text-xs text-slate-500 leading-relaxed">{stock.businessRelevance}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {concept.notes && (
                    <div className="mt-6">
                      <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> 备注
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-200">
                        {concept.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredConcepts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">暂无涨价概念</h3>
            <p className="text-sm text-slate-500">点击"新增概念"或"导入"按钮添加数据</p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">导入涨价概念数据</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`请输入JSON格式数据，例如：
{
  "concepts": [
    {
      "name": "锂电",
      "category": "新能源材料",
      "cycleName": "2024Q1锂电涨价周期",
      "status": "ongoing",
      "priceChange": "+25%",
      "driverFactors": ["原材料短缺", "需求激增"],
      "relatedStocks": [
        {
          "stockName": "宁德时代",
          "stockCode": "300750",
          "impactLevel": "high"
        }
      ]
    }
  ]
}`}
                className="w-full h-96 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              />
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-500/20"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingConcept && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {isAddingNew ? '新增涨价概念' : '编辑涨价概念'}
              </h3>
              <button
                onClick={() => {
                  setEditingConcept(null);
                  setIsAddingNew(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">概念名称</label>
                  <input
                    type="text"
                    value={editingConcept.name}
                    onChange={(e) => setEditingConcept({ ...editingConcept, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="如：锂电、MLCC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">分类</label>
                    <input
                      type="text"
                      value={editingConcept.category}
                      onChange={(e) => setEditingConcept({ ...editingConcept, category: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      placeholder="如：原材料"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">周期名称</label>
                    <input
                      type="text"
                      value={editingConcept.cycleInfo.cycleName}
                      onChange={(e) => setEditingConcept({
                        ...editingConcept,
                        cycleInfo: { ...editingConcept.cycleInfo, cycleName: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      placeholder="如：2024Q1涨价周期"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">状态</label>
                    <select
                      value={editingConcept.cycleInfo.status}
                      onChange={(e) => setEditingConcept({
                        ...editingConcept,
                        cycleInfo: { ...editingConcept.cycleInfo, status: e.target.value as any }
                      })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="ongoing">进行中</option>
                      <option value="ended">已结束</option>
                      <option value="paused">暂停</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">价格涨幅</label>
                    <input
                      type="text"
                      value={editingConcept.cycleInfo.priceChange}
                      onChange={(e) => setEditingConcept({
                        ...editingConcept,
                        cycleInfo: { ...editingConcept.cycleInfo, priceChange: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      placeholder="如：+30%"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-2">开始日期</label>
                    <input
                      type="date"
                      value={editingConcept.cycleInfo.startDate || ''}
                      onChange={(e) => setEditingConcept({
                        ...editingConcept,
                        cycleInfo: { ...editingConcept.cycleInfo, startDate: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">驱动因素（用逗号分隔）</label>
                  <input
                    type="text"
                    value={editingConcept.cycleInfo.driverFactors.join(', ')}
                    onChange={(e) => setEditingConcept({
                      ...editingConcept,
                      cycleInfo: { ...editingConcept.cycleInfo, driverFactors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                    })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="如：原材料短缺, 需求激增, 产能不足"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">市场影响</label>
                  <textarea
                    value={editingConcept.cycleInfo.marketImpact}
                    onChange={(e) => setEditingConcept({
                      ...editingConcept,
                      cycleInfo: { ...editingConcept.cycleInfo, marketImpact: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none h-20"
                    placeholder="描述涨价对市场的影响..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">备注</label>
                  <textarea
                    value={editingConcept.notes || ''}
                    onChange={(e) => setEditingConcept({ ...editingConcept, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none h-20"
                    placeholder="其他备注信息..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingConcept(null);
                  setIsAddingNew(false);
                }}
                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveConcept}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-500/20"
              >
                <Save className="w-4 h-4" /> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceMonitor;
