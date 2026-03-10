#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为所有剩余股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
ALL_FINAL_MAP = {
    # 第一组
    "三维通信": "002115",
    "科陆电子": "002121",
    "神剑股份": "002361",
    "航发控制": "000738",
    "金隅集团": "601992",
    "航天发展": "000547",
    
    # 第二组
    "鹏辉能源": "300438",
    "宏工科技": "301265",
    "德龙激光": "688170",
    "宝明科技": "002992",
    "长信科技": "300088",
    "天能股份": "688819",
    "洁美科技": "002859",
    "英联股份": "002846",
    "赢合科技": "300457",
    "东芯股份": "688110",
    "神工股份": "688233",
    
    # 第三组
    "民德电子": "300656",
    "电科芯片": "600877",
    "高新发展": "000628",
    "广立微": "301095",
    "铁建重工": "688425",
    "超捷股份": "301005",
    "乾照光电": "300102",
    
    # 第四组
    "精测电子": "300567",
    "晶升股份": "688478",
    "长电科技": "600584",
    "正帆科技": "688596",
    "利扬芯片": "688135",
    "安集科技": "688019",
    
    # 第五组
    "华天科技": "002185",
    "三孚股份": "603938",
    "至纯科技": "603690",
    "帝科股份": "300842",
    "晋拓股份": "603211",
    "古鳌科技": "300551",
    "大港股份": "002077",
    "普冉股份": "688766",
    "兆易创新": "603986",
    "概伦电子": "688206",
    "华润微": "688396",
}

def supplement_all_final(input_file, output_file):
    """为所有剩余股票补充代码"""
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
            if name in ALL_FINAL_MAP:
                stock['code'] = ALL_FINAL_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {ALL_FINAL_MAP[name]}")
            # 尝试去除前缀匹配
            else:
                # 去除常见前缀
                prefixes = ['流失', '深厚', '环境', '光伏', '组件', '扩建', '明显', '通信', '建设', '加密', '再生', '设备', '构件', '支撑', '试点', '制备', '片设计', '封装', '销售', '材料', '集成', '工艺', '研发', '构件', '盈新', '大', '投资', '兆', '概伦', '华润']
                for prefix in prefixes:
                    if name.startswith(prefix):
                        cleaned_name = name[len(prefix):]
                        if cleaned_name in ALL_FINAL_MAP:
                            stock['code'] = ALL_FINAL_MAP[cleaned_name]
                            updated_count += 1
                            print(f"更新: {name} → {cleaned_name} → {ALL_FINAL_MAP[cleaned_name]}")
                            break
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-终极完整版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终完美版.json'
    
    supplement_all_final(input_file, output_file)
