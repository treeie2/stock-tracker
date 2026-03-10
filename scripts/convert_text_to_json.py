#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将文本格式的股票信息转换为JSON格式
"""

import json
import re
from datetime import datetime

# 股票代码映射
STOCK_CODE_MAP = {
    "安迪苏": "600299",
    "新和成": "002001",
    "兄弟科技": "002562",
    "拉卡拉": "300773",
    "恒生电子": "600570",
    "昆仑万维": "300418",
    "拓维信息": "002261",
    "拓尔思": "300229",
    "蓝色光标": "300058",
    "星环科技": "688031",
    "优刻得": "688158",
    "网宿科技": "300017",
    "青云科技": "688316",
    "润泽科技": "300442",
    "云赛智联": "600602",
    "深桑达A": "000032",
    "首都在线": "300846",
    "宝信软件": "600845",
    "润建股份": "002929",
    "协创数据": "300857",
    "美利云": "000815",
    "恒为科技": "603496",
    "亚康股份": "301139",
    "龙芯中科": "688047",
    "寒武纪": "688256",
    "中贝通信": "603220",
    "东芯股份": "688110",
    "海光信息": "688041",
    "中科曙光": "603019",
    "汇绿生态": "001267",
    "海鸥股份": "603269",
    "振江股份": "603507",
    "拉普拉斯": "688726",
    "迈为": "300751",
    "帝科股份": "300842",
    "亚玛顿": "002623",
    "中泰化学": "002092",
    "新疆天业": "600075",
    "三友化工": "600409",
    "君正集团": "601216",
    "北元集团": "601568",
    "万华化学": "600309",
    "公元股份": "002641",
    "伟星新材": "002372",
    "佳先股份": "430489",
    "华谊集团": "600623",
    "联瑞新材": "688300",
    "雅克科技": "002409",
    "凯盛科技": "600552",
}

def parse_text_to_stocks(text):
    """解析文本为股票列表"""
    stocks = []
    current_stock = None
    current_content = []
    
    lines = text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 匹配股票名称和代码，如"安迪苏（600299）"
        match = re.match(r'^(.+?)\s*[（(](\d+)[）)]', line)
        if match:
            # 保存之前的股票
            if current_stock:
                current_stock['content'] = '\n'.join(current_content)
                current_stock['logic'] = '\n'.join(current_content)
                stocks.append(current_stock)
            
            name = match.group(1).strip()
            code = match.group(2).strip()
            
            # 如果代码不在映射中，使用提取的代码
            if name in STOCK_CODE_MAP:
                code = STOCK_CODE_MAP[name]
            
            current_stock = {
                "id": f"s_{int(datetime.now().timestamp()*1000)}_{len(stocks)}",
                "name": name,
                "code": code,
                "price": "---",
                "dailyChange": "---",
                "marketCap": "---",
                "peRatio": "---",
                "revenue": "---",
                "concepts": [],
                "products": [],
                "sector": "---",
                "targetValuation": "估值: -",
                "earningsForecast": "",
                "lastUpdated": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
                "records": []
            }
            current_content = []
        else:
            # 尝试匹配"【股票名称】："格式
            match2 = re.match(r'^[【\[]([\u4e00-\u9fa5A-Za-z]+)[】\]][：:]', line)
            if match2:
                name = match2.group(1).strip()
                # 检查是否是已知的股票名称
                if name in STOCK_CODE_MAP:
                    # 保存之前的股票
                    if current_stock:
                        current_stock['content'] = '\n'.join(current_content)
                        current_stock['logic'] = '\n'.join(current_content)
                        stocks.append(current_stock)
                    
                    code = STOCK_CODE_MAP[name]
                    current_stock = {
                        "id": f"s_{int(datetime.now().timestamp()*1000)}_{len(stocks)}",
                        "name": name,
                        "code": code,
                        "price": "---",
                        "dailyChange": "---",
                        "marketCap": "---",
                        "peRatio": "---",
                        "revenue": "---",
                        "concepts": [],
                        "products": [],
                        "sector": "---",
                        "targetValuation": "估值: -",
                        "earningsForecast": "",
                        "lastUpdated": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
                        "records": []
                    }
                    current_content = []
                    # 提取冒号后的内容
                    content_part = line.split('：', 1)[1] if '：' in line else line.split(':', 1)[1] if ':' in line else ''
                    if content_part.strip():
                        current_content.append(content_part.strip())
                elif current_stock:
                    current_content.append(line)
            else:
                # 尝试匹配"股票名称："格式
                match3 = re.match(r'^([\u4e00-\u9fa5A-Za-z]+)[：:]', line)
                if match3:
                    name = match3.group(1).strip()
                    # 检查是否是已知的股票名称
                    if name in STOCK_CODE_MAP:
                        # 保存之前的股票
                        if current_stock:
                            current_stock['content'] = '\n'.join(current_content)
                            current_stock['logic'] = '\n'.join(current_content)
                            stocks.append(current_stock)
                        
                        code = STOCK_CODE_MAP[name]
                        current_stock = {
                            "id": f"s_{int(datetime.now().timestamp()*1000)}_{len(stocks)}",
                            "name": name,
                            "code": code,
                            "price": "---",
                            "dailyChange": "---",
                            "marketCap": "---",
                            "peRatio": "---",
                            "revenue": "---",
                            "concepts": [],
                            "products": [],
                            "sector": "---",
                            "targetValuation": "估值: -",
                            "earningsForecast": "",
                            "lastUpdated": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
                            "records": []
                        }
                        current_content = []
                        # 提取冒号后的内容
                        content_part = line.split('：', 1)[1] if '：' in line else line.split(':', 1)[1] if ':' in line else ''
                        if content_part.strip():
                            current_content.append(content_part.strip())
                    elif current_stock:
                        current_content.append(line)
                elif current_stock:
                    # 添加内容行
                    current_content.append(line)
    
    # 保存最后一个股票
    if current_stock:
        current_stock['content'] = '\n'.join(current_content)
        current_stock['logic'] = '\n'.join(current_content)
        stocks.append(current_stock)
    
    return stocks

def create_records(stocks):
    """为每个股票创建记录"""
    for stock in stocks:
        record = {
            "id": f"rec_{int(datetime.now().timestamp()*1000)}_{stock['name'][:4]}",
            "stockId": stock['id'],
            "timestamp": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
            "customDate": datetime.now().strftime("%Y.%m.%d"),
            "title": f"{datetime.now().strftime('%Y.%m.%d')} 研报更新",
            "content": stock.get('content', ''),
            "logic": stock.get('logic', ''),
            "dataPoints": [],
            "rawText": stock.get('content', '')
        }
        stock['records'] = [record]
        # 删除临时字段
        if 'content' in stock:
            del stock['content']
        if 'logic' in stock:
            del stock['logic']

def convert_text_to_json(text, output_file):
    """转换文本为JSON"""
    print("正在解析文本...")
    stocks = parse_text_to_stocks(text)
    print(f"共解析 {len(stocks)} 只股票")
    
    create_records(stocks)
    
    data = {
        "stocks": stocks,
        "lastUpdated": datetime.now().strftime("%Y/%m/%d %H:%M:%S")
    }
    
    print(f"正在保存到: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("保存成功!")
    return stocks

if __name__ == '__main__':
    import sys
    
    # 从命令行参数读取文件
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        with open(input_file, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        # 默认文本
        text = """安迪苏（600299） 
 - 定位：全球蛋氨酸+特种营养双龙头，央企背景、全球化布局 
 - 核心：蛋氨酸（67万吨，全球第二）+特种产品（高毛利41%）+维生素 
 - 壁垒：蛋氨酸寡头（CR3≈80%）、欧洲+中国双基地、成本优势显著 
 成长引擎：特种产品（反刍、酶制剂、斐康®）20%+增长，蛋氨酸报价：25元/kg+为反转； 欧洲开工率：<70%→供给收缩；特种产品占比：≥30%→成长确认第二曲线"""
    
    output_file = r'e:\web\imi\app\new-stocks.json'
    convert_text_to_json(text, output_file)
