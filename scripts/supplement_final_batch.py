#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为最后一批股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
FINAL_BATCH_MAP = {
    # 第一组
    "远东股份": "600869",
    "华峰科技": "688209",
    "汇源通信": "000586",
    "亨通光电": "600487",
    "烽火通信": "600498",
    "中天科技": "600522",
    "中瓷电子": "003031",
    "欧路科技": "待补充",
    
    # 第二组
    "富信科技": "688662",
    "东田微": "301183",
    "石英股份": "603688",
    "环旭电子": "601231",
    "新亚强": "603155",
    "新相微": "688593",
    "南大光电": "300346",
    "开滦股份": "600997",
    "兖矿能源": "600188",
    "大有能源": "600403",
    "中煤能源": "601898",
    "万泰生物": "603392",
    
    # 第三组
    "云煤能源": "600792",
    "淮北矿业": "600985",
    "昊华能源": "601101",
    "迈克生物": "300463",
    "凯普生物": "300639",
    "之江生物": "688317",
    "智飞生物": "300122",
    "沃森生物": "300142",
    "海王生物": "000078",
    "康泰生物": "300601",
    "科前生物": "688526",
    
    # 第四组
    "中牧股份": "600195",
    "宝钢股份": "600019",
    "三星医疗": "601567",
    "东方电子": "000682",
    "中国星网": "待补充",
    "航天电子": "600879",
    
    # 第五组
    "中国卫通": "601698",
    "航天科技": "000901",
}

def supplement_final_batch(input_file, output_file):
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
            if name in FINAL_BATCH_MAP:
                stock['code'] = FINAL_BATCH_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {FINAL_BATCH_MAP[name]}")
            # 尝试去除前缀匹配
            else:
                # 去除常见前缀
                prefixes = ['方案', '能力', '部件', '完普', '品种', '党工', '庄碧捷捷', '框架', '场景化能', '万台', '战略', '设备', '倍东', '信百', '信友发', '倍中', '倍四方', '倍合', '倍利', '倍益', '倍大商', '倍通']
                for prefix in prefixes:
                    if name.startswith(prefix):
                        cleaned_name = name[len(prefix):]
                        if cleaned_name in FINAL_BATCH_MAP:
                            stock['code'] = FINAL_BATCH_MAP[cleaned_name]
                            updated_count += 1
                            print(f"更新: {name} → {cleaned_name} → {FINAL_BATCH_MAP[cleaned_name]}")
                            break
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终完整版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-终极完整版.json'
    
    supplement_final_batch(input_file, output_file)
