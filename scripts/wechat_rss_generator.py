#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号RSS生成服务
功能：将微信公众号文章转换为RSS格式，便于自动抓取
"""

import os
import json
import time
import random
import logging
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import xml.etree.ElementTree as ET
from xml.dom import minidom

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WeChatRSSGenerator:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
        })
        
        # 微信公众号配置
        self.accounts = [
            {
                "name": "财新经纬",
                "account_id": "caixinjingwei",
                "url": "https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzA5MDU0MzUyOA==&scene=124#wechat_redirect"
            },
            {
                "name": "光大证券研究",
                "account_id": "emnews",
                "url": "https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MjM5NjIwNzYyMA==&scene=124#wechat_redirect"
            },
            {
                "name": "招商证券研究",
                "account_id": "ChinaMerchantsSecuritiesResearch",
                "url": "https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzA4MDQ2NjEzNQ==&scene=124#wechat_redirect"
            },
            {
                "name": "广发证券研究",
                "account_id": "gfresearch",
                "url": "https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzA4NzA4NTUxOA==&scene=124#wechat_redirect"
            },
            {
                "name": "海通证券研究",
                "account_id": "hxzqyj",
                "url": "https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzA5MDU0MzUyOA==&scene=124#wechat_redirect"
            }
        ]
    
    def fetch_articles(self, account: Dict) -> List[Dict]:
        """获取微信公众号文章列表"""
        try:
            # 这里使用第三方RSS服务作为示例
            # 实际使用时需要配置微信公众号的API或使用第三方服务
            rss_url = f"https://rsshub.app/wechat/mp/{account['account_id']}"
            
            response = self.session.get(rss_url, timeout=30)
            response.raise_for_status()
            
            # 解析RSS
            root = ET.fromstring(response.text)
            
            articles = []
            for item in root.findall('.//item'):
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                description = item.find('description').text if item.find('description') is not None else ''
                pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ''
                
                # 过滤股票相关文章
                if self._is_stock_related(title):
                    articles.append({
                        'title': title,
                        'link': link,
                        'description': description,
                        'pub_date': pub_date,
                        'source': account['name']
                    })
            
            logger.info(f"从 {account['name']} 获取到 {len(articles)} 篇股票相关文章")
            return articles
            
        except Exception as e:
            logger.error(f"获取 {account['name']} 文章失败: {e}")
            return []
    
    def _is_stock_related(self, title: str) -> bool:
        """判断标题是否与股票相关"""
        stock_keywords = [
            "股票", "研报", "投资", "行情", "分析", "策略", "板块", 
            "个股", "财报", "业绩", "估值", "推荐", "评级", "目标价"
        ]
        
        title = title.lower()
        for keyword in stock_keywords:
            if keyword in title:
                return True
        return False
    
    def generate_rss(self, articles: List[Dict], channel_title: str = "股票研报RSS") -> str:
        """生成RSS XML"""
        rss = ET.Element('rss', {'version': '2.0', 'encoding': 'UTF-8'})
        
        channel = ET.SubElement(rss, 'channel')
        ET.SubElement(channel, 'title').text = channel_title
        ET.SubElement(channel, 'link').text = "https://stock-tracker-seven-blush.vercel.app"
        ET.SubElement(channel, 'description').text = "微信公众号股票研报RSS订阅"
        ET.SubElement(channel, 'lastBuildDate').text = datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')
        
        for article in articles:
            item = ET.SubElement(channel, 'item')
            ET.SubElement(item, 'title').text = article['title']
            ET.SubElement(item, 'link').text = article['link']
            ET.SubElement(item, 'description').text = article.get('description', '')
            ET.SubElement(item, 'pubDate').text = article.get('pub_date', '')
            ET.SubElement(item, 'author').text = article.get('source', '')
        
        # 美化XML输出
        rough_string = ET.tostring(rss, 'utf-8')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
    
    def generate_json(self, articles: List[Dict]) -> Dict:
        """生成JSON格式数据"""
        return {
            "channel": {
                "title": "股票研报RSS",
                "link": "https://stock-tracker-seven-blush.vercel.app",
                "description": "微信公众号股票研报RSS订阅",
                "lastBuildDate": datetime.now().isoformat()
            },
            "articles": articles,
            "count": len(articles)
        }
    
    def run(self) -> Dict[str, any]:
        """主运行函数"""
        logger.info("开始生成微信公众号RSS")
        
        all_articles = []
        
        # 获取所有公众号的文章
        for account in self.accounts:
            articles = self.fetch_articles(account)
            all_articles.extend(articles)
            
            # 防止请求过快
            time.sleep(random.uniform(1, 2))
        
        # 去重
        unique_articles = self._deduplicate_articles(all_articles)
        logger.info(f"共获取 {len(unique_articles)} 篇唯一文章")
        
        # 生成RSS
        rss_content = self.generate_rss(unique_articles)
        
        # 生成JSON
        json_content = self.generate_json(unique_articles)
        
        # 保存到文件
        self._save_to_files(rss_content, json_content)
        
        return {
            "rss": rss_content,
            "json": json_content,
            "count": len(unique_articles)
        }
    
    def _deduplicate_articles(self, articles: List[Dict]) -> List[Dict]:
        """去重文章"""
        seen = set()
        unique = []
        
        for article in articles:
            key = article['title']
            if key not in seen:
                seen.add(key)
                unique.append(article)
        
        return unique
    
    def _save_to_files(self, rss_content: str, json_content: Dict):
        """保存到文件"""
        try:
            # 保存RSS
            with open('wechat_rss.xml', 'w', encoding='utf-8') as f:
                f.write(rss_content)
            logger.info("RSS文件已保存到 wechat_rss.xml")
            
            # 保存JSON
            with open('wechat_rss.json', 'w', encoding='utf-8') as f:
                json.dump(json_content, f, ensure_ascii=False, indent=2)
            logger.info("JSON文件已保存到 wechat_rss.json")
            
        except Exception as e:
            logger.error(f"保存文件失败: {e}")

if __name__ == "__main__":
    generator = WeChatRSSGenerator()
    result = generator.run()
    print(f"生成完成，共 {result['count']} 篇文章")
