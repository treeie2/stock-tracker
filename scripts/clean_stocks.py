#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
删除非A股股票、名称不完整和未上市企业的条目
"""

import json

# 要删除的股票类型判断函数
def should_delete(stock):
    name = stock.get('name', '')
    code = stock.get('code', '')
    
    # 1. 代码为待补充的
    if code == '待补充':
        return True
    
    # 2. 名称不完整的（如"族数控"、"洋电机"等）
    if len(name) <= 2 or name in ['族数控', '族激光', '洋电机', '位科技', '驰股份', '港股份', '易创新', '电子', '微', '发展', '中矿业']:
        return True
    
    # 3. 非A股股票（代码不是6位数字）
    if code and not (code.isdigit() and len(code) == 6):
        return True
    
    return False

def clean_stocks(input_file, output_file):
    """清理股票数据"""
    print(f"正在读取文件: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    stocks = data.get('stocks', [])
    print(f"共读取 {len(stocks)} 只股票")
    
    original_count = len(stocks)
    cleaned_stocks = [stock for stock in stocks if not should_delete(stock)]
    deleted_count = original_count - len(cleaned_stocks)
    
    print(f"删除了 {deleted_count} 只股票")
    print(f"剩余 {len(cleaned_stocks)} 只股票")
    
    # 保存清理后的数据
    data['stocks'] = cleaned_stocks
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-优化版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-清理版.json'
    
    clean_stocks(input_file, output_file)
