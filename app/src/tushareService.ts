
const TUSHARE_TOKEN = 'a6ab502affda551ced82aade45cfe77d3c6339b8198266850230876c';
const TUSHARE_URL = 'https://api.tushare.pro';

export interface MarketData {
  price: string;
  pct_chg: string;
  marketCap: string;
  peRatio: string;
}

export interface StockBasicInfo {
  ts_code: string;
  symbol: string;
  name: string;
  area: string;
  industry: string;
  fullname: string;
  enname: string;
  cnspell: string;
  market: string;
  exchange: string;
  curr_type: string;
  list_status: string;
  list_date: string;
  delist_date: string | null;
  is_hs: string;
}

/**
 * 将普通代码转换为 Tushare 需要的格式 (例如 600000 -> 600000.SH)
 */
function formatTsCode(code: string): string {
  if (!code || code === '---') return '';
  const cleanCode = code.replace(/[^0-9]/g, '');
  if (cleanCode.length !== 6) return code;
  
  if (cleanCode.startsWith('6')) return `${cleanCode}.SH`;
  if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) return `${cleanCode}.SZ`;
  if (cleanCode.startsWith('8') || cleanCode.startsWith('4')) return `${cleanCode}.BJ`;
  return cleanCode;
}

/**
 * 通过股票名称查询股票基本信息（获取股票代码）
 */
export async function searchStockByName(name: string): Promise<StockBasicInfo | null> {
  try {
    const response = await fetch(TUSHARE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({
        api_name: 'stock_basic',
        token: TUSHARE_TOKEN,
        params: {},
        fields: 'ts_code,symbol,name,area,industry,fullname,enname,cnspell,market,exchange,curr_type,list_status,list_date,delist_date,is_hs'
      })
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.data && result.data.items && result.data.items.length > 0) {
      // 字段顺序: ts_code[0], symbol[1], name[2], area[3], industry[4], fullname[5], enname[6], cnspell[7], market[8], exchange[9], curr_type[10], list_status[11], list_date[12], delist_date[13], is_hs[14]
      const stocks: StockBasicInfo[] = result.data.items.map((item: any[]) => ({
        ts_code: item[0],
        symbol: item[1],
        name: item[2],
        area: item[3],
        industry: item[4],
        fullname: item[5],
        enname: item[6],
        cnspell: item[7],
        market: item[8],
        exchange: item[9],
        curr_type: item[10],
        list_status: item[11],
        list_date: item[12],
        delist_date: item[13],
        is_hs: item[14]
      }));
      
      // 精确匹配名称
      let match = stocks.find(s => s.name === name);
      
      // 如果没有精确匹配，尝试模糊匹配
      if (!match) {
        match = stocks.find(s => s.name.includes(name) || name.includes(s.name));
      }
      
      // 如果还没有匹配，尝试拼音首字母匹配
      if (!match) {
        const namePinyin = name.toLowerCase().replace(/[^a-z]/g, '');
        match = stocks.find(s => {
          const stockPinyin = (s.cnspell || '').toLowerCase().replace(/[^a-z]/g, '');
          return stockPinyin === namePinyin || stockPinyin.includes(namePinyin) || namePinyin.includes(stockPinyin);
        });
      }
      
      return match || null;
    }
    
    return null;
  } catch (error) {
    console.warn(`Tushare 股票查询失败: ${name}`, error);
    return null;
  }
}

/**
 * 批量查询多个股票的代码信息
 */
export async function batchSearchStocks(names: string[]): Promise<Map<string, StockBasicInfo | null>> {
  const result = new Map<string, StockBasicInfo | null>();
  
  // 先获取所有股票基础数据（缓存）
  try {
    const response = await fetch(TUSHARE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({
        api_name: 'stock_basic',
        token: TUSHARE_TOKEN,
        params: {},
        fields: 'ts_code,symbol,name,area,industry,fullname,enname,cnspell,market,exchange,curr_type,list_status,list_date,delist_date,is_hs'
      })
    });

    if (!response.ok) {
      names.forEach(name => result.set(name, null));
      return result;
    }

    const apiResult = await response.json();
    if (apiResult.data && apiResult.data.items) {
      const allStocks: StockBasicInfo[] = apiResult.data.items.map((item: any[]) => ({
        ts_code: item[0],
        symbol: item[1],
        name: item[2],
        area: item[3],
        industry: item[4],
        fullname: item[5],
        enname: item[6],
        cnspell: item[7],
        market: item[8],
        exchange: item[9],
        curr_type: item[10],
        list_status: item[11],
        list_date: item[12],
        delist_date: item[13],
        is_hs: item[14]
      }));
      
      // 为每个名称查找匹配
      for (const name of names) {
        // 精确匹配
        let match = allStocks.find(s => s.name === name);
        
        // 模糊匹配
        if (!match) {
          match = allStocks.find(s => s.name.includes(name) || name.includes(s.name));
        }
        
        // 拼音匹配
        if (!match) {
          const namePinyin = name.toLowerCase().replace(/[^a-z]/g, '');
          match = allStocks.find(s => {
            const stockPinyin = (s.cnspell || '').toLowerCase().replace(/[^a-z]/g, '');
            return stockPinyin === namePinyin || stockPinyin.includes(namePinyin) || namePinyin.includes(stockPinyin);
          });
        }
        
        result.set(name, match || null);
      }
    } else {
      names.forEach(name => result.set(name, null));
    }
  } catch (error) {
    console.warn('Tushare 批量查询失败:', error);
    names.forEach(name => result.set(name, null));
  }
  
  return result;
}

export async function fetchStockPrice(code: string): Promise<MarketData | null> {
  const tsCode = formatTsCode(code);
  if (!tsCode) return null;

  try {
    // 转换代码格式为腾讯API格式: 600519.SH -> sh600519
    const [symbol, market] = tsCode.split('.');
    const tencentCode = `${market.toLowerCase()}${symbol}`;
    const url = `https://qt.gtimg.cn/q=${tencentCode}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const text = await response.text();
    // 响应格式: v_sh600519="1~贵州茅台~600519~1427.00~..."
    const matches = text.match(/="(.*)";/);
    if (!matches || !matches[1]) return null;

    const parts = matches[1].split('~');
    if (parts.length < 46) return null;

    // 解析数据
    // Index 3: 当前价格
    // Index 32: 涨跌幅(%)
    // Index 39: 市盈率(TTM)
    // Index 45: 总市值(亿元)
    
    const price = parts[3] ? parseFloat(parts[3]).toFixed(2) : '---';
    const pctVal = parseFloat(parts[32]);
    const pct_chg = !isNaN(pctVal) ? (pctVal >= 0 ? `+${pctVal.toFixed(2)}%` : `${pctVal.toFixed(2)}%`) : '0.00%';
    const peRatio = parts[39] ? parseFloat(parts[39]).toFixed(2) : '---';
    const marketCap = parts[45] ? `${parseFloat(parts[45]).toFixed(2)}亿` : '---';

    return {
      price,
      pct_chg,
      marketCap,
      peRatio
    };
    
  } catch (error) {
    console.warn(`实时行情获取失败 (${code}):`, error);
    return null;
  }
}
