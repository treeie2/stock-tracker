
export interface Stock {
  id: string;
  name: string;
  code: string;
  price: string | number;     // 当前股价
  marketCap: string | number; // 市值
  peRatio: string | number;   // 市盈率
  dailyChange: string | number; // 今日涨幅
  revenue: string | number;   // 营业额/业绩
  concepts: string[];
  products: string[];
  sector: string;             // 所属板块
  targetValuation: string;    // 目标估值
  earningsForecast: string;   // 业绩预测
  lastUpdated: string;
  records: AnalysisRecord[];
}

export interface AnalysisRecord {
  id: string;
  stockId: string;
  timestamp: string;          // 自动生成的录入时间
  customDate?: string;        // 用户手动输入的日期
  title: string;
  content: string;
  logic: string;
  dataPoints: DataPoint[];
  rawText: string;
}

export interface DataPoint {
  label: string;
  value: string | number;
  unit?: string;
}

export const ViewMode = {
  DASHBOARD: 'DASHBOARD',
  IMPORT: 'IMPORT',
  DETAIL: 'DETAIL'
} as const;

export type ViewMode = typeof ViewMode[keyof typeof ViewMode];

export interface ExtractedInfo {
  stockName: string;
  stockCode: string;
  title: string;
  logic: string;
  price?: string | number;
  marketCap?: string | number;
  peRatio?: string | number;
  dailyChange?: string | number;
  revenue?: string | number;
  date?: string;
  concepts: string[];
  products: string[];
  sector: string;
  targetValuation?: string;
  earningsForecast?: string;
  dataPoints: DataPoint[];
}
