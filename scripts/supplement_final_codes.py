#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为最终一批股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
FINAL_CODE_MAP = {
    "兴瑞科技": "002937",
    "金钟股份": "301133",
    "二组中矿资源": "待补充",
    "新泉股份": "603179",
    "明昱沃股份": "待补充",
    "方正电机": "002196",
    "双飞集团": "300817",  # 双飞股份
    "华强股份": "待补充",
    "景嘉微": "300474",
    "寒武纪": "688256",
    "海光信息": "688041",
    "决腾股份": "待补充",
    "长电科技": "600584",
    "北方华创": "002371",
    "赛石英": "待补充",
    "第五步": "待补充",
    "云天化": "600096",
    "新和成": "002001",
    "金正大": "002470",
    "吉华集团": "603980",
    "华尔泰": "001217",
    "澄星股份": "600078",
    "双环环保": "待补充",
    "特变化工": "待补充",
    "湖北宜化": "000422",
    "扬农化工": "600486",
    "新安股份": "600596",
    "光年科技": "待补充",
    "华鲁化工": "600426",  # 华鲁恒升
    "维远股份": "600955",
    "江山股份": "600389",
    "浙江医药": "600216",
    "航材股份": "688563",
    "航发控制": "000738",
    "中国船舶": "600150",
    "上海集团": "待补充",
    "名雕股份": "002830",
    "三变科技": "002112",
    "积成电子": "002339",
    "业绩长江通信": "600345",  # 长江通信
    "天元股份": "003003",
    "晋控电力": "000767",
    "南矿集团": "001360",
    "订单金华化工": "待补充",
    "双乐股份": "301036",
    "矿涨洪兴股份": "待补充",
    "京华激光": "603607",
    "订单申联股份": "688098",  # 申联生物
    "苏博特": "603916",
    "订单科森科技": "603626",
    "众信旅游": "002707",
    "建发股份": "600153",
}

def supplement_final_codes(input_file, output_file):
    """为最终一批股票补充代码"""
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
            if name in FINAL_CODE_MAP:
                stock['code'] = FINAL_CODE_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {FINAL_CODE_MAP[name]}")
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终优化.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-完整版.json'
    
    supplement_final_codes(input_file, output_file)
