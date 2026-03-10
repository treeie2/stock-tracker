#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
合并相同个股的数据
"""

import json
from datetime import datetime

def merge_stocks(input_file, output_file):
    """合并相同个股"""
    print(f"正在读取文件：{input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    stocks = data.get('stocks', [])
    print(f"共读取 {len(stocks)} 只股票")
    
    # 按代码和名称分组
    stock_dict = {}
    for stock in stocks:
        key = f"{stock['code']}_{stock['name']}"
        
        if key not in stock_dict:
            stock_dict[key] = {
                **stock,
                'records': []
            }
        else:
            # 合并记录
            existing_records = stock_dict[key]['records']
            new_records = stock.get('records', [])
            
            # 避免重复记录
            existing_ids = {r['id'] for r in existing_records}
            for record in new_records:
                if record['id'] not in existing_ids:
                    existing_records.append(record)
        
        # 合并概念
        if 'concepts' in stock and stock['concepts']:
            existing_concepts = set(stock_dict[key].get('concepts', []))
            new_concepts = set(stock.get('concepts', []))
            stock_dict[key]['concepts'] = list(existing_concepts | new_concepts)
        
        # 更新其他字段（取非空值）
        for field in ['sector', 'targetValuation', 'earningsForecast', 'price', 'marketCap', 'peRatio']:
            if stock.get(field) and stock.get(field) not in ['---', '', '估值: -']:
                stock_dict[key][field] = stock[field]
    
    # 转换回列表
    merged_stocks = list(stock_dict.values())
    
    print(f"合并后剩余 {len(merged_stocks)} 只股票")
    print(f"共合并 {len(stocks) - len(merged_stocks)} 只重复股票")
    
    # 保存
    data['stocks'] = merged_stocks
    data['lastUpdated'] = datetime.now().strftime("%Y/%m/%d %H:%M:%S")
    
    print(f"正在保存到：{output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")
    
    # 显示合并详情
    if len(stocks) > len(merged_stocks):
        print("\n合并详情:")
        for key, stock in stock_dict.items():
            if len(stock.get('records', [])) > 1:
                print(f"  - {stock['name']} ({stock['code']}): {len(stock['records'])} 条记录")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = r'e:\web\imi\app\new-stocks.json'
    
    output_file = r'e:\web\imi\app\merged-stocks.json'
    
    merge_stocks(input_file, output_file)
