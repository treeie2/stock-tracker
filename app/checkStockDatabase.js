import { readFileSync } from 'fs';

// 读取stockDatabase.ts文件内容
const stockDatabaseContent = readFileSync('./src/stockDatabase.ts', 'utf8');

// 提取股票数据
const stockDataMatch = stockDatabaseContent.match(/const stockDatabase: StockBasicInfo\[\] = \[(.*?)\];/s);
if (!stockDataMatch) {
  console.error('无法提取股票数据');
  process.exit(1);
}

// 解析股票数据
const stockDataString = stockDataMatch[1];
const stockMatches = stockDataString.match(/\{\s*symbol:\s*"([^"]+)",\s*name:\s*"([^"]+)"\s*\}/g);

const stockDatabase = stockMatches.map(match => {
  const symbolMatch = match.match(/symbol:\s*"([^"]+)"/);
  const nameMatch = match.match(/name:\s*"([^"]+)"/);
  return {
    symbol: symbolMatch ? symbolMatch[1] : '',
    name: nameMatch ? nameMatch[1] : ''
  };
});

// 用户导入的股票列表
const userStocks = [
  '玛玛科技',
  '恒辉安防',
  '宏工科技',
  '浙矿股份',
  '博盈特焊',
  '伊戈尔',
  '神马股份',
  '科得达',
  '蓝帆股份'
];

console.log('检查用户导入的股票是否在本地数据库中存在:');
console.log('=====================================');

userStocks.forEach(stockName => {
  const foundStock = stockDatabase.find(stock => stock.name === stockName);
  if (foundStock) {
    console.log(`✓ ${stockName}: ${foundStock.symbol}`);
  } else {
    // 尝试模糊匹配
    const fuzzyMatch = stockDatabase.find(stock => 
      stock.name.includes(stockName) || stockName.includes(stock.name)
    );
    if (fuzzyMatch) {
      console.log(`⚠️ ${stockName}: 模糊匹配到 ${fuzzyMatch.name} (${fuzzyMatch.symbol})`);
    } else {
      console.log(`✗ ${stockName}: 未找到`);
    }
  }
});

console.log('\n本地数据库股票总数:', stockDatabase.length);
console.log('\n本地数据库前20条股票:');
console.log('==================');
stockDatabase.slice(0, 20).forEach((stock, index) => {
  console.log(`${index + 1}. ${stock.name}: ${stock.symbol}`);
});
