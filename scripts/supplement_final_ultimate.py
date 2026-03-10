#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为最后一批股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
FINAL_ULTIMATE_MAP = {
    # 第一组
    "中矿资源": "002738",
    "威顿股份": "待补充",
    "盛屯矿业": "600711",
    "思瑞浦": "688536",
    "万兴科技": "300624",
    "汉得信息": "300170",
    "钧达电子": "002865",
    "恒润股份": "603985",
    "联创电子": "002036",
    "蓝箭电子": "301348",
    
    # 第二组
    "山大电力": "待补充",
    "通达股份": "002560",
    "洋河股份": "002304",
    "科翔股份": "300903",
    "航锦科技": "000818",
    "澳弘电子": "605058",
    "直真科技": "003007",
    
    # 第三组
    "晓程科技": "300139",
    "华自科技": "300490",
    "远东股份": "600869",
    "天通股份": "600330",
    "宇晶股份": "002943",
    "晶澳科技": "002459",
    "紫金矿业": "601899",
    "锡业股份": "000960",
    "包钢股份": "600010",
    "西部矿业": "601168",
    "华钰矿业": "601020",
    
    # 第四组
    "钧达股份": "002865",
}

def supplement_final_ultimate(input_file, output_file):
    """为最后一批股票补充代码"""
    print(f"正在读取文件: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    stocks = data.get('stocks', [])
    print(f"共读取 {len(stocks)} 只股票")
    
    updated_count = 0
    
    for stock in stocks:
        name = stock.get('name', '')
        current_code = stock.get('code', '')
        
        # 检查是否需要补充代码
        if current_code.startswith('待补充_') or current_code == '待补充':
            # 尝试直接匹配
            if name in FINAL_ULTIMATE_MAP:
                stock['code'] = FINAL_ULTIMATE_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {FINAL_ULTIMATE_MAP[name]}")
            # 尝试去除前缀匹配
            else:
                # 去除常见前缀
                prefixes = ['万吨', '前列', '模型', '能力', '渠道', '场景', '性高', '适配', '更强', '率高', '深厚', '显著']
                for prefix in prefixes:
                    if name.startswith(prefix):
                        cleaned_name = name[len(prefix):]
                        if cleaned_name in FINAL_ULTIMATE_MAP:
                            stock['code'] = FINAL_ULTIMATE_MAP[cleaned_name]
                            updated_count += 1
                            print(f"更新: {name} → {cleaned_name} → {FINAL_ULTIMATE_MAP[cleaned_name]}")
                            break
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终最终版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终最终最终版.json'
    
    supplement_final_ultimate(input_file, output_file)
