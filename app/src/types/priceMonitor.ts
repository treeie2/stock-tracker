// 涨价监控相关类型定义

export interface PriceIncreaseConcept {
  id: string;
  name: string;                    // 涨价概念名称，如"锂电"、"MLCC"
  category: string;                // 分类，如"原材料"、"电子元件"
  cycleInfo: PriceCycle;           // 本轮涨价周期信息
  relatedStocks: RelatedStock[];   // 相关概念股列表
  createdAt: string;
  updatedAt: string;
  notes?: string;                  // 备注
}

export interface PriceCycle {
  cycleName: string;               // 本轮周期名称，如"2024Q1涨价周期"
  startDate?: string;              // 周期开始日期
  endDate?: string;                // 周期结束日期（如已结束）
  status: 'ongoing' | 'ended' | 'paused';  // 周期状态
  priceChange: string;             // 价格涨幅，如"+30%"
  driverFactors: string[];         // 涨价驱动因素
  marketImpact: string;            // 市场影响描述
}

export interface RelatedStock {
  stockId: string;                 // 关联的股票ID
  stockName: string;               // 股票名称
  stockCode: string;               // 股票代码
  relationType: string;            // 关联类型，如"直接受益"、"间接受益"
  impactLevel: 'high' | 'medium' | 'low';  // 影响程度
  businessRelevance: string;       // 业务关联度描述
}

export interface PriceMonitorViewProps {
  concepts: PriceIncreaseConcept[];
  onImport: (data: PriceIncreaseConcept[]) => void;
  onExport: () => void;
  onDelete: (id: string) => void;
  onUpdate: (concept: PriceIncreaseConcept) => void;
}

// 导入数据格式
export interface PriceMonitorImportData {
  concepts: {
    name: string;
    category?: string;
    cycleName: string;
    startDate?: string;
    endDate?: string;
    status: 'ongoing' | 'ended' | 'paused';
    priceChange: string;
    driverFactors: string[];
    marketImpact?: string;
    relatedStocks: {
      stockName: string;
      stockCode: string;
      relationType?: string;
      impactLevel?: 'high' | 'medium' | 'low';
      businessRelevance?: string;
    }[];
    notes?: string;
  }[];
}
