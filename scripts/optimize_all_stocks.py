#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化所有个股名称，检测并补充代码
"""

import json
import re

# 动词前缀列表
VERB_PREFIXES = [
    '需求', '涨价', '利用', '方案', '能力', '部件', '完普', '品种', '党工', 
    '庄碧捷捷', '框架', '场景化能', '万台', '战略', '设备', '倍东', '信百', 
    '信友发', '倍中', '倍四方', '倍合', '倍利', '倍益', '倍大商', '倍通',
    '流失', '深厚', '环境', '光伏', '组件', '扩建', '明显', '通信', '建设', 
    '加密', '再生', '构件', '支撑', '试点', '制备', '片设计', '封装', '销售', 
    '材料', '集成', '工艺', '研发', '盈新', '大', '投资', '兆', '概伦', '华润',
    '解之', '拆解之', '加速', '业绩', '见效', '景气', '充裕', '风险', '积压', '变化',
    '万吨', '前列', '模型', '渠道', '场景', '性高', '适配', '更强', '率高'
]

# 股票代码映射
STOCK_CODE_MAP = {
    "新雷能": "300593",
    "应流股份": "603308",
    "万华化学": "600309",
    "兴发集团": "600141",
    "江丰电子": "300666",
    "唯万密封": "301161",
    # 补充更多股票代码
    "复旦微电": "688385",
    "陕西华达": "301517",
    "顺灏股份": "002565",
    "贝克休斯": "BHGE",
    "西门子能源": "ENRGY",
    "安萨尔多": "待补充",
    "GE航空": "GE",
    "中国重燃": "待补充",
    "商发": "待补充",
    "Vicor": "VICR",
}

def clean_stock_name(name):
    """清理股票名称"""
    # 去除冒号及后面内容
    if '：' in name:
        name = name.split('：')[0]
    if ':' in name:
        name = name.split(':')[0]
    
    # 按长度降序排序前缀，优先匹配长前缀
    sorted_prefixes = sorted(VERB_PREFIXES, key=len, reverse=True)
    for prefix in sorted_prefixes:
        if name.startswith(prefix):
            return name[len(prefix):].lstrip('的之')
    
    return name

def supplement_stock_code(name):
    """补充股票代码"""
    return STOCK_CODE_MAP.get(name, "待补充")

def optimize_stocks(input_file, output_file):
    """优化所有个股"""
    print(f"正在读取文件: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    stocks = data.get('stocks', [])
    print(f"共读取 {len(stocks)} 只股票")
    
    updated_count = 0
    supplement_count = 0
    
    for stock in stocks:
        original_name = stock.get('name', '')
        cleaned_name = clean_stock_name(original_name)
        
        # 如果名称有变化，更新
        if cleaned_name != original_name:
            stock['name'] = cleaned_name
            updated_count += 1
            print(f"更新名称: {original_name} → {cleaned_name}")
        
        # 检查代码是否需要补充
        current_code = stock.get('code', '')
        if current_code == '待补充' or '待补充' in current_code:
            new_code = supplement_stock_code(cleaned_name)
            if new_code != current_code:
                stock['code'] = new_code
                supplement_count += 1
                print(f"补充代码: {cleaned_name} → {new_code}")
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的名称")
    print(f"共补充 {supplement_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08 (4).json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-优化版.json'
    
    optimize_stocks(input_file, output_file)
