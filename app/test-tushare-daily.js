
const TUSHARE_TOKEN = 'a6ab502affda551ced82aade45cfe77d3c6339b8198266850230876c';
const TUSHARE_URL = 'https://api.tushare.pro';

function formatTsCode(code) {
  if (!code || code === '---') return '';
  const cleanCode = code.replace(/[^0-9]/g, '');
  if (cleanCode.length !== 6) return code;
  
  if (cleanCode.startsWith('6')) return `${cleanCode}.SH`;
  if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) return `${cleanCode}.SZ`;
  if (cleanCode.startsWith('8') || cleanCode.startsWith('4')) return `${cleanCode}.BJ`;
  return cleanCode;
}

async function fetchStockPrice(code) {
  const tsCode = formatTsCode(code);
  console.log(`Testing 'daily' API for code: ${code} -> ${tsCode}`);
  
  if (!tsCode) return null;

  try {
    const response = await fetch(TUSHARE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_name: 'daily',
        token: TUSHARE_TOKEN,
        params: {
          ts_code: tsCode,
          limit: 1
        },
        fields: 'trade_date,close,pct_chg'
      })
    });

    if (!response.ok) {
      console.error('API Response not OK:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    console.log('Raw API Result:', JSON.stringify(result, null, 2));

    if (result.data && result.data.items && result.data.items.length > 0) {
      const item = result.data.items[0];
      // fields: trade_date[0], close[1], pct_chg[2]
      const price = item[1] ? item[1].toFixed(2).toString() : '---';
      const pct_chg = item[2] !== null ? (item[2] >= 0 ? `+${item[2].toFixed(2)}%` : `${item[2].toFixed(2)}%`) : '0.00%';
      
      // Note: daily API does not provide pe_ttm or total_mv
      
      return {
        price,
        pct_chg
      };
    } else {
        console.log('No data items found in response');
    }
    
    return null;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

// Test with Ping An Bank (000001)
fetchStockPrice('000001').then(data => {
  console.log('Parsed Data:', data);
});
