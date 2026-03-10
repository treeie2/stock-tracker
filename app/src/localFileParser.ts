import type { ExtractedInfo } from './types/index';
import { searchStockByName } from './stockDatabase';

/**
 * 从本地文本文件解析股票信息
 * @param text 文件内容
 * @returns 解析后的股票信息数组
 */
export function parseLocalStockFile(text: string): ExtractedInfo[] {
  // 尝试解析JSON格式
  try {
    const trimmedText = text.trim();
    if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
      console.log('尝试解析JSON格式数据...');
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
        return [extracted];
      }
      
      // 处理多条记录数组
      if (Array.isArray(jsonData)) {
        console.log('解析JSON数组，包含', jsonData.length, '条记录');
        
        // 优先检查一帆风顺JSON格式 (包含"名称"、"逻辑"、"引自"字段)
        const firstItem = jsonData[0];
        if (firstItem && firstItem['名称']) {
          console.log('解析一帆风顺JSON格式，包含', jsonData.length, '条记录');
          return jsonData.map((item: any) => {
            const logic = item['逻辑'];
            let logicText = '';
            if (typeof logic === 'object') {
              logicText = [logic['概况'], logic['订单'], logic['产品']].filter(Boolean).join('\n');
            } else {
              logicText = String(logic || '');
            }
            return {
              stockName: item['名称'] || '',
              stockCode: '',
              title: `${item['日期'] || new Date().toLocaleDateString()} ${item['引自'] || '研报'}`,
              logic: logicText,
              date: item['日期'] || '',
              sector: item['引自'] || '研报',
              concepts: [],
              products: logic?.['产品'] ? [logic['产品']] : [],
              targetValuation: item['估值'] || '',
              dataPoints: []
            };
          }).filter((item: ExtractedInfo) => item.stockName);
        }
        
        // 检查是否为Stock对象数组（包含name字段和records数组）
        if (firstItem && firstItem.name && firstItem.records && Array.isArray(firstItem.records)) {
          console.log('解析Stock对象数组，包含', jsonData.length, '个股票');
          return jsonData.map((stock: any) => {
            // 获取最新的记录
            const latestRecord = stock.records && stock.records.length > 0 ? stock.records[0] : null;
            
            return {
              stockName: stock.name || stock.stockName || '',
              stockCode: stock.code || stock.stockCode || '',
              title: latestRecord?.title || `${latestRecord?.customDate || stock.lastUpdated || new Date().toLocaleDateString()} 研报更新`,
              logic: latestRecord?.logic || latestRecord?.content || '',
              date: latestRecord?.customDate || latestRecord?.timestamp || stock.lastUpdated || '',
              sector: stock.sector || stock.concepts?.[0] || '',
              concepts: stock.concepts || [],
              products: stock.products || [],
              targetValuation: stock.targetValuation || latestRecord?.valuation || '',
              dataPoints: latestRecord?.dataPoints || []
            };
          }).filter((item: ExtractedInfo) => item.stockName);
        }
        
        // 处理ExtractedInfo对象数组
        return jsonData.map((item: Partial<ExtractedInfo> & { content?: string }) => ({
          stockName: item.stockName || item.name || '',
          stockCode: item.stockCode || item.code || '',
          title: item.title || `${item.date || new Date().toLocaleDateString()} 研报更新`,
          logic: item.logic || item.content || '',
          date: item.date || '',
          sector: item.sector || item.concepts?.[0] || '',
          concepts: item.concepts || [],
          products: item.products || [],
          targetValuation: item.targetValuation || '',
          dataPoints: item.dataPoints || []
        })).filter((item: ExtractedInfo) => item.stockName);
      }
      
      // 处理包含stocks字段的对象
      if (jsonData.stocks && Array.isArray(jsonData.stocks)) {
        console.log('解析包含stocks字段的JSON对象，包含', jsonData.stocks.length, '条记录');
        return jsonData.stocks.map((stock: any) => ({
          stockName: stock.name || stock.stockName || '',
          stockCode: stock.code || stock.stockCode || '',
          title: stock.records?.[0]?.title || `${stock.records?.[0]?.customDate || new Date().toLocaleDateString()} 研报更新`,
          logic: stock.records?.[0]?.logic || '',
          date: stock.records?.[0]?.customDate || stock.records?.[0]?.timestamp || '',
          sector: stock.sector || '',
          concepts: stock.concepts || [],
          products: stock.products || [],
          targetValuation: stock.targetValuation || '',
          dataPoints: stock.records?.[0]?.dataPoints || []
        })).filter((item: ExtractedInfo) => item.stockName);
      }
    }
  } catch (error) {
    console.log('JSON解析失败，尝试解析文本格式:', error);
    // JSON解析失败，继续尝试文本格式解析
  }
  
  // 按分隔符分割文本，获取每条记录
  const result: ExtractedInfo[] = [];
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
