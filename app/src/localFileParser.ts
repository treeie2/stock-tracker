import type { ExtractedInfo } from './types/index';
import { searchStockByName } from './stockDatabase';

/**
 * 从本地文本文件解析股票信息
 * @param text 文件内容
 * @returns 解析后的股票信息数组
 */
export function parseLocalStockFile(text: string): ExtractedInfo[] {
  const result: ExtractedInfo[] = [];
  
  // 按分隔符分割文本，获取每条记录
  const records = text.split('------------------------------------------------------------------------------------------------------------------------');
  
  // 遍历每条记录
  for (const record of records) {
    const lines = record.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) continue;
    
    // 解析日期和标题
    let date = '';
    let title = '';
    let stockName = '';
    
    const firstLine = lines[0].trim();
    const dateMatch = firstLine.match(/^(\d{4}\.\d{2}\.\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
      // 提取标题，去掉日期和标记
      title = firstLine.replace(/^\d{4}\.\d{2}\.\d{2} ⭕/, '').trim();
      
      // 尝试从标题中提取股票名称
      const stockMatch = title.match(/【(.+?)】/);
      if (stockMatch) {
        stockName = stockMatch[1].trim();
      }
    }
    
    // 解析概念
    let concepts: string[] = [];
    const conceptLine = lines.find(line => line.trim().startsWith('概念:'));
    if (conceptLine) {
      const conceptText = conceptLine.replace(/^概念:\s*/, '').trim();
      if (conceptText && conceptText !== '-') {
        concepts = conceptText.split(',').map(c => c.trim());
      }
    }
    
    // 解析逻辑
    let logic = '';
    const logicLine = lines.find(line => line.trim().startsWith('逻辑:'));
    if (logicLine) {
      logic = logicLine.replace(/^逻辑:\s*/, '').trim();
      // 合并后续行，直到遇到估值行
      const logicIndex = lines.indexOf(logicLine);
      for (let i = logicIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('估值:')) break;
        logic += ' ' + line;
      }
    }
    
    // 解析估值
    let targetValuation = '';
    const valuationLine = lines.find(line => line.trim().startsWith('估值:'));
    if (valuationLine) {
      targetValuation = valuationLine.replace(/^估值:\s*/, '').trim();
      if (targetValuation === '-') targetValuation = '';
    }
    
    // 尝试从逻辑中提取股票代码
    let stockCode = '';
    const codeMatch = logic.match(/(\d{6})/);
    if (codeMatch) {
      stockCode = codeMatch[1];
    }
    
    // 从本地数据库中查找股票代码
    if (!stockCode && stockName) {
      const stockInfo = searchStockByName(stockName);
      if (stockInfo) {
        stockCode = stockInfo.symbol;
      }
    }
    
    // 提取行业板块
    let sector = '';
    if (concepts.length > 0) {
      sector = concepts[0];
    }
    
    // 构建数据点
    const dataPoints = [];
    if (targetValuation) {
      dataPoints.push({ label: '目标估值', value: targetValuation });
    }
    
    // 创建提取信息对象
    const extracted: ExtractedInfo = {
      stockName,
      stockCode,
      title,
      logic,
      date,
      sector,
      concepts,
      products: [],
      targetValuation,
      dataPoints
    };
    
    // 只有当股票名称存在时才添加
    if (stockName) {
      result.push(extracted);
    }
  }
  
  return result;
}

/**
 * 批量解析本地文件中的股票信息
 * @param text 文件内容
 * @returns 按日期分组的股票信息
 */
export function parseLocalStockFileByDate(text: string): Map<string, ExtractedInfo[]> {
  const allStocks = parseLocalStockFile(text);
  const groupedByDate = new Map<string, ExtractedInfo[]>();
  
  for (const stock of allStocks) {
    const date = stock.date || '未知日期';
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, []);
    }
    groupedByDate.get(date)?.push(stock);
  }
  
  return groupedByDate;
}
