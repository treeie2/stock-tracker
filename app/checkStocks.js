import { readFileSync } from 'fs';

try {
  const data = readFileSync('./localStorageData.json', 'utf8');
  const stocks = JSON.parse(data);
  console.log('股票数量:', stocks.length);
  console.log('\n股票列表:');
  stocks.forEach((s, i) => {
    console.log(`${i+1}. ${s.name}: ${s.code} (${s.records.length}条研报)`);
  });
  console.log('\n第一条股票详情:');
  if (stocks.length > 0) {
    console.log('ID:', stocks[0].id);
    console.log('名称:', stocks[0].name);
    console.log('代码:', stocks[0].code);
    console.log('价格:', stocks[0].price);
    console.log('涨幅:', stocks[0].dailyChange);
    console.log('市值:', stocks[0].marketCap);
    console.log('市盈率:', stocks[0].peRatio);
    console.log('研报数量:', stocks[0].records.length);
    if (stocks[0].records.length > 0) {
      console.log('第一条研报stockId:', stocks[0].records[0].stockId);
    }
  }
} catch (error) {
  console.error('读取文件失败:', error.message);
}
