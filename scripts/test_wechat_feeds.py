#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试微信公众号RSS抓取
模拟从倍塔周期和一帆风顺研究院获取数据
"""

import os
import json
from datetime import datetime

class WeChatTestFetcher:
    def __init__(self):
        # JSON库存储路径
        self.json_library_path = "json_library"
        os.makedirs(self.json_library_path, exist_ok=True)
    
    def generate_test_data(self):
        """生成测试数据"""
        test_articles = [
            # 倍塔周期文章
            {
                "title": "2026年2月市场策略：关注科技板块机会",
                "link": "https://mp.weixin.qq.com/s/beita1",
                "description": "倍塔周期研究院认为，2026年2月科技板块将迎来重要投资机会，特别是人工智能和半导体领域...",
                "pub_date": "2026-02-08T08:00:00Z",
                "source": "beita-cycle",
                "fetch_time": datetime.now().isoformat()
            },
            {
                "title": "军工板块深度分析：景气度持续上行",
                "link": "https://mp.weixin.qq.com/s/beita2",
                "description": "倍塔周期研究院最新研报显示，军工板块景气度持续上行，建议关注核心装备供应商...",
                "pub_date": "2026-02-07T09:00:00Z",
                "source": "beita-cycle",
                "fetch_time": datetime.now().isoformat()
            },
            # 一帆风顺研究院文章
            {
                "title": "新能源汽车行业：2026年展望",
                "link": "https://mp.weixin.qq.com/s/yffsyjy1",
                "description": "一帆风顺研究院认为，2026年新能源汽车行业将继续保持高速增长，海外市场成为新的增长点...",
                "pub_date": "2026-02-09T10:00:00Z",
                "source": "yffsyjy",
                "fetch_time": datetime.now().isoformat()
            },
            {
                "title": "半导体产业链投资机会分析",
                "link": "https://mp.weixin.qq.com/s/yffsyjy2",
                "description": "一帆风顺研究院深度分析半导体产业链，认为国产替代进程加速，设备和材料领域机会凸显...",
                "pub_date": "2026-02-08T11:00:00Z",
                "source": "yffsyjy",
                "fetch_time": datetime.now().isoformat()
            }
        ]
        return test_articles
    
    def save_to_json_library(self, articles):
        """保存到JSON库"""
        date = datetime.now().strftime('%Y-%m-%d')
        
        try:
            # 保存每日数据
            daily_file = os.path.join(self.json_library_path, f"articles_{date}.json")
            
            # 加载现有数据
            existing_data = []
            if os.path.exists(daily_file):
                with open(daily_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            
            # 合并数据
            existing_articles = {article['title']: article for article in existing_data}
            for article in articles:
                existing_articles[article['title']] = article
            
            # 保存
            with open(daily_file, 'w', encoding='utf-8') as f:
                json.dump(list(existing_articles.values()), f, ensure_ascii=False, indent=2)
            
            print(f"已保存 {len(articles)} 篇测试文章到 {daily_file}")
            print(f"当前库中共有 {len(existing_articles)} 篇文章")
            
        except Exception as e:
            print(f"保存到JSON库失败: {e}")
    
    def run(self):
        """运行测试"""
        print("开始测试微信公众号RSS抓取")
        print("模拟从以下公众号获取数据:")
        print("1. 倍塔周期 (beita-cycle)")
        print("2. 一帆风顺研究院 (yffsyjy)")
        print()
        
        # 生成测试数据
        test_articles = self.generate_test_data()
        
        # 打印测试数据
        print("生成的测试文章:")
        for article in test_articles:
            print(f"- [{article['source']}] {article['title']}")
        print()
        
        # 保存到JSON库
        self.save_to_json_library(test_articles)
        
        print("\n测试完成！")

if __name__ == "__main__":
    fetcher = WeChatTestFetcher()
    fetcher.run()
