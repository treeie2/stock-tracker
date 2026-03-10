#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试解析JSON文件"""

import json
import sys

def test_parse():
    file_path = r'e:\web\imi\app\一帆风顺个股信息-8c97de5b86.json'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"文件类型: {type(data)}")
    print(f"数据长度: {len(data)}")
    
    if len(data) > 0:
        first_item = data[0]
        print(f"\n第一条记录:")
        print(f"  名称: {first_item.get('名称', 'N/A')}")
        print(f"  逻辑: {first_item.get('逻辑', 'N/A')}")
        print(f"  引自: {first_item.get('引自', 'N/A')}")
        print(f"  日期: {first_item.get('日期', 'N/A')}")
        
        # 检查是否有"名称"字段
        if '名称' in first_item:
            print("\n✓ 文件包含'名称'字段，解析器应该能正确识别")

if __name__ == '__main__':
    test_parse()
