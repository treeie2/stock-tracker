#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将研报JSON文件导入到JSON库
"""

import os
import json
from datetime import datetime

def import_stock_data(json_file_path):
    """导入股票研报数据到JSON库"""
    
    # JSON库存储路径
    json_library_path = "json_library"
    os.makedirs(json_library_path, exist_ok=True)
    
    # 读取JSON文件
    print(f"正在读取文件: {json_file_path}")
    with open(json_file_path, 'r', encoding='utf-8') as f:
        stock_data = json.load(f)
    
    print(f"成功读取 {len(stock_data)} 条股票记录")
    
    # 转换数据格式
    articles = []
    for item in stock_data:
        # 提取字段
        name = item.get('名称', '')
        logic = item.get('逻辑', {})
        valuation = item.get('估值', '')
        date = item.get('日期', '')
        source = item.get('引自', '一帆风顺研究院')
        link = item.get('链接', '')
        
        # 构建文章内容
        description = ""
        if isinstance(logic, dict):
            # 组合逻辑中的各个字段
            parts = []
            if logic.get('概况'):
                parts.append(f"【概况】{logic.get('概况')}")
            if logic.get('订单'):
                parts.append(f"【订单】{logic.get('订单')}")
            if logic.get('产品'):
                parts.append(f"【产品】{logic.get('产品')}")
            description = '\n'.join(parts)
        else:
            description = str(logic)
        
        # 创建文章对象
        article = {
            'title': name,
            'description': description,
            'source': source,
            'link': link,
            'date': date,
            'valuation': valuation,
            'fetch_time': datetime.now().isoformat(),
            'stock_name': name,
            'logic': logic
        }
        
        articles.append(article)
    
    # 保存到JSON库
    date_str = datetime.now().strftime('%Y-%m-%d')
    daily_file = os.path.join(json_library_path, f"articles_{date_str}.json")
    
    # 加载现有数据
    existing_data = []
    if os.path.exists(daily_file):
        with open(daily_file, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
    
    # 合并数据
    existing_titles = {article['title']: article for article in existing_data}
    for article in articles:
        existing_titles[article['title']] = article
    
    # 保存
    with open(daily_file, 'w', encoding='utf-8') as f:
        json.dump(list(existing_titles.values()), f, ensure_ascii=False, indent=2)
    
    print(f"\n导入完成！")
    print(f"- 新增记录: {len(articles)} 条")
    print(f"- 保存位置: {daily_file}")
    print(f"- 总记录数: {len(existing_titles)} 条")
    
    # 统计来源
    sources = {}
    for article in articles:
        source = article['source']
        sources[source] = sources.get(source, 0) + 1
    
    print(f"\n来源统计:")
    for source, count in sources.items():
        print(f"  - {source}: {count} 条")

if __name__ == '__main__':
    # 要导入的文件
    json_file = r'e:\web\imi\app\一帆风顺个股信息-8c97de5b86.json'
    
    import_stock_data(json_file)
