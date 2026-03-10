#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为最后一批股票补充代码
"""

import json

# 补充股票代码映射（基于最新截图）
FINAL_ALL_MAP = {
    # 第一组
    "古鳌科技": "300551",
    "国芯科技": "688262",
    "深科技": "000021",
    "太龙股份": "300650",
    "三安光电": "600703",
    "中电电机": "603988",
    "众信旅游": "002707",
    "健麾信息": "605186",
    "淮油股份": "002207",
    "华伍股份": "300095",
    
    # 第二组
    "省广集团": "002400",
    "粤传媒": "002181",
    "腾达科技": "待补充",
    "贤丰控股": "002141",
    "鸿远电子": "603267",
    
    # 第三组
    "华安证券": "600909",
    "首药控股": "688197",
    "大华股份": "002236",
    "药康生物": "688046",
    "中原传媒": "000719",
    "恒为科技": "603496",
    "长虹能源": "836239",
    "光大证券": "601788",
    "康强电子": "002119",
    "奥飞娱乐": "002292",
    "上海电影": "601595",
    
    # 第四组
    "新媒股份": "300770",
    "富春股份": "300299",
    "北京文化": "000802",
    "吉视传媒": "601929",
    "金逸影视": "002905",
    "亚康股份": "301085",
    "掌趣科技": "300315",
    "三维通信": "002115",
    "天音控股": "000829",
    
    # 第五组
    "星辉娱乐": "300043",
    "顺网科技": "300113",
    "彩讯股份": "300634",
    "姚记科技": "002605",
    "科大讯飞": "002230",
    "冰轮环境": "000811",
    "分众传媒": "002027",
    "果麦文化": "301052",
    "天龙集团": "300063",
}

def supplement_final_all(input_file, output_file):
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
            if name in FINAL_ALL_MAP:
                stock['code'] = FINAL_ALL_MAP[name]
                updated_count += 1
                print(f"更新: {name} → {FINAL_ALL_MAP[name]}")
            # 尝试去除前缀匹配
            else:
                # 去除常见前缀
                prefixes = ['解之', '拆解之', '加速', '业绩', '见效', '景气', '充裕', '深厚', '销售', '应用', '风险', '积压', '变化']
                for prefix in prefixes:
                    if name.startswith(prefix):
                        cleaned_name = name[len(prefix):]
                        if cleaned_name in FINAL_ALL_MAP:
                            stock['code'] = FINAL_ALL_MAP[cleaned_name]
                            updated_count += 1
                            print(f"更新: {name} → {cleaned_name} → {FINAL_ALL_MAP[cleaned_name]}")
                            break
    
    # 保存
    print(f"\n共更新 {updated_count} 只股票的代码")
    print(f"正在保存到: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")

if __name__ == '__main__':
    input_file = r'e:\web\imi\app\stock-tracker-2026-03-08-最终完美版.json'
    output_file = r'e:\web\imi\app\stock-tracker-2026-03-08-终极完美版.json'
    
    supplement_final_all(input_file, output_file)
