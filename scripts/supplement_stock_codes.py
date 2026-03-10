#!/usr/bin/env python3
"""
为光刻胶相关公司补充股票代码
"""
import json
import re

# 股票代码映射表
STOCK_CODES = {
    "圣泉集团": "605589",
    "兴业股份": "603928",
    "泰和科技": "300801",
    "华懋科技": "603306",
    "东材科技": "601208",
    "万润股份": "002643",
    "瑞联新材": "688550",
    "强力新材": "300429",
    "扬帆新材": "300637",
    "久日新材": "688199",
    "兴福电子": "688056",
    "华融化学": "301256",
    "格林达": "603931",
    "安集科技": "688019",
    "江化微": "603078",
    "国风新材": "000859",
    "鼎龙股份": "300054",
    "广信材料": "300537",
    "彤程新材": "603650",
    "南大光电": "300346",
    "容大感光": "300576",
    "上海新阳": "300236",
    "晶瑞新材": "300655",
    "飞凯材料": "300398",
    "艾森股份": "688526",
    "高盟新材": "300200",
    "雅克科技": "002409",
    "恒坤新材": "688283",
    "华特气体": "688268",
    "凯美特气": "002549"
}

def supplement_stock_codes(input_file, output_file):
    """为JSON文件中的公司补充股票代码"""
    print(f"正在读取文件：{input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    stocks = data.get('stocks', [])
    print(f"共读取 {len(stocks)} 只股票")
    
    supplement_count = 0
    
    for stock in stocks:
        name = stock['name']
        if name in STOCK_CODES:
            stock['code'] = STOCK_CODES[name]
            supplement_count += 1
            print(f"已补充 {name} 的代码: {STOCK_CODES[name]}")
        else:
            print(f"未找到 {name} 的代码")
    
    # 保存更新后的数据
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n补充完成！共补充 {supplement_count} 只股票的代码")
    print(f"更新后的文件已保存到：{output_file}")

if __name__ == "__main__":
    input_file = "e:\\web\\imi\\app\\lithography-companies-2026-03-10.json"
    output_file = "e:\\web\\imi\\app\\lithography-companies-2026-03-10-updated.json"
    supplement_stock_codes(input_file, output_file)
