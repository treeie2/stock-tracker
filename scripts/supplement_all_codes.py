#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为所有股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
ALL_CODE_MAP = {
    # 第一组
    "华天酒店": "000428",
    "春秋航空": "601021",
    "翔宇医疗": "688626",
    "联影医疗": "688271",
    "晶科能源": "688223",
    "名雕股份": "002830",
    "民德光电": "300656",
    
    # 第二组
    "德才股份": "605287",
    "蓝特光学": "688127",
    "易天股份": "300812",
    
    # 第三组
    "龙磁科技": "300835",
    "确成股份": "605183",
    "汉缆股份": "002498",
    "四方股份": "601126",
    "和胜股份": "002824",
    "高澜股份": "300499",
    "新洁能": "605111",
    "钧达股份": "002865",
    
    # 第四组
    "奥特维": "688516",
    "高测股份": "688556",
    "欧晶科技": "001269",
    "帝尔激光": "300776",
    "露笑科技": "002617",
    "爱旭股份": "600732",
    "福莱特": "601865",
    "清源股份": "603628",
    
    # 第五组
    "固德威": "688390",
    "昱能科技": "688348",
    "中利集团": "002309",
    "能辉科技": "301046",
    "华民股份": "300345",
    "乾照光电": "300102",
    "时创能源": "688429",
    "禾迈股份": "688032",
    "亿晶光电": "600537",
    "晶澳科技": "002459",
    "大金重工": "002487",
}

def supplement_all_codes(input_file, output_file):
    """为所有股票补充代码"""
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
            if name in ALL_CODE_MAP:
                stock['code'] = ALL_CODE_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {ALL_CODE_MAP[name]}")
            # 尝试去除前缀匹配
            else:
                # 去除常见前缀
                prefixes = ['明确', '性大', '丰富', '道器', '装备', '算法', '扩张', '打造', '方案', '道边', '渠道', '运营', '阳水', '技术', '大金']
                for prefix in prefixes:
                    if name.startswith(prefix):
                        cleaned_name = name[len(prefix):]
                        if cleaned_name in ALL_CODE_MAP:
                            stock['code'] = ALL_CODE_MAP[cleaned_name]
                            updated_count += 1
                            print(f"更新: {name} → {cleaned_name} → {ALL_CODE_MAP[cleaned_name]}")
                            break
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-完整版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终完整版.json'
    
    supplement_all_codes(input_file, output_file)
