#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为终极一批股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
ULTIMATE_MAP = {
    # 第一组
    "隆基股份": "601012",
    "华自科技": "300490",
    "泰豪科技": "600590",
    "派思股份": "603318",
    "安孚科技": "603031",
    "三变科技": "002112",
    "高合科技": "待补充",
    "永鼎股份": "600105",
    "四方股份": "601126",
    "经纬股份": "301390",
    
    # 第二组
    "岭南控股": "000524",
    "至正股份": "603991",
    "大港股份": "002077",
    "综艺股份": "600770",
    "万通发展": "600246",
    "华设设计": "603018",
    "可川科技": "603052",
    "广合科技": "300995",
    "白银有色": "601212",
    "金瑞矿业": "600714",
    "锋龙股份": "002931",
    
    # 第三组
    "方正电机": "002196",
    "模塑科技": "000700",
    "龙新能源": "待补充",
    "新联电子": "002546",
    "红墙股份": "002809",
    "威帝股份": "603023",
    "朗博科技": "603655",
    "蜂巢股份": "待补充",
    "凯众股份": "603037",
    "华联控股": "000036",
    "天际股份": "002759",
    "舒华体育": "605299",
    
    # 第四组
    "四川双马": "000935",
    "韦尔股份": "603501",
    "海光信息": "688041",
    "澜起科技": "688008",
    "东芯股份": "688110",
    "全志科技": "300458",
    "鸣志电器": "603728",
    "江苏雷利": "300660",
    
    # 第五组
    "力源信息": "300184",
    "海南橡胶": "601118",
    "海南机场": "600515",
    "罗牛山": "000735",
    "京粮控股": "000505",
    "中国移动": "600941",
    "风范股份": "601700",
    "电科院": "300215",
    "大连电瓷": "002606",
    "白云电器": "603861",
    "中超控股": "002471",
}

def supplement_ultimate(input_file, output_file):
    """为终极一批股票补充代码"""
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
            if name in ULTIMATE_MAP:
                stock['code'] = ULTIMATE_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {ULTIMATE_MAP[name]}")
            # 尝试去除前缀匹配
            else:
                # 去除常见前缀
                prefixes = ['风险', '深厚', '系统', '解放', '安孚', '沃智', '释放', '项目', '扩张', '决胜', '绝缘', '产品', '材料', '辅材', '硬件', '器件', '金属', '矿企', '器人', '动化', '构件', '件卧', '设备', '化工', '车链', '动力', '峰端', '加工', '锂电', '渠道', '量产', '垒高', '推理', '领域', '散热', '力源', '看供需', '大连']
                for prefix in prefixes:
                    if name.startswith(prefix):
                        cleaned_name = name[len(prefix):]
                        if cleaned_name in ULTIMATE_MAP:
                            stock['code'] = ULTIMATE_MAP[cleaned_name]
                            updated_count += 1
                            print(f"更新: {name} → {cleaned_name} → {ULTIMATE_MAP[cleaned_name]}")
                            break
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-终极完美版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终最终版.json'
    
    supplement_ultimate(input_file, output_file)
