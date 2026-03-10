#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动fetch RSS内容服务
功能：定期从RSS源获取内容，解析并存储到JSON库
"""

import os
import json
import time
import logging
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RSSFetcher:
    def __init__(self, rss_url: str = None):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
        })
        
        # RSS源配置
        self.rss_urls = rss_url or [
            "https://rsshub.app/wechat/mp/beita-cycle",  # 倍塔周期
            "https://rsshub.app/wechat/mp/yffsyjy"  # 一帆风顺研究院
        ]
        
        # JSON库存储路径
        self.json_library_path = "json_library"
        os.makedirs(self.json_library_path, exist_ok=True)
        
        # 历史数据
        self.history_file = os.path.join(self.json_library_path, "fetch_history.json")
        self.history = self._load_history()
    
    def _load_history(self) -> Dict:
        """加载历史数据"""
        try:
            if os.path.exists(self.history_file):
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"加载历史数据失败: {e}")
        
        return {
            "last_fetch": None,
            "total_articles": 0,
            "fetched_articles": []
        }
    
    def _save_history(self):
        """保存历史数据"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存历史数据失败: {e}")
    
    def fetch_rss(self, url: str) -> Optional[str]:
        """获取RSS内容"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as e:
            logger.error(f"获取RSS失败 {url}: {e}")
            return None
    
    def parse_rss(self, rss_content: str, source: str = "unknown") -> List[Dict]:
        """解析RSS内容"""
        try:
            root = ET.fromstring(rss_content)
            
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
                        'description': self._clean_html(description),
                        'pub_date': pub_date,
                        'source': source,
                        'fetch_time': datetime.now().isoformat()
                    })
            
            logger.info(f"从 {source} 解析到 {len(articles)} 篇股票相关文章")
            return articles
            
        except Exception as e:
            logger.error(f"解析RSS失败: {e}")
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
    
    def _clean_html(self, html_content: str) -> str:
        """清理HTML标签"""
        try:
            if not html_content:
                return ""
            
            soup = BeautifulSoup(html_content, 'html.parser')
            return soup.get_text(strip=True)
        except Exception as e:
            logger.warning(f"清理HTML失败: {e}")
            return html_content
    
    def fetch_article_content(self, url: str) -> Optional[str]:
        """获取文章完整内容"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取文章内容
            content_divs = soup.find_all(['div', 'article'], class_=lambda x: x and any(
                keyword in x for keyword in ['content', 'rich_media_content', 'article_content']
            ))
            
            content = []
            for div in content_divs:
                paragraphs = div.find_all(['p', 'section'])
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if text and len(text) > 10:
                        content.append(text)
            
            if not content:
                # 尝试提取所有段落
                paragraphs = soup.find_all('p')
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if text and len(text) > 10:
                        content.append(text)
            
            return '\n'.join(content)
            
        except Exception as e:
            logger.error(f"获取文章内容失败 {url}: {e}")
            return None
    
    def save_to_json_library(self, articles: List[Dict], date: str = None):
        """保存到JSON库"""
        if not date:
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
            
            logger.info(f"已保存 {len(articles)} 篇文章到 {daily_file}")
            
            # 更新历史
            self.history['last_fetch'] = datetime.now().isoformat()
            self.history['total_articles'] += len(articles)
            self.history['fetched_articles'].extend([{
                'title': article['title'],
                'source': article['source'],
                'fetch_time': article['fetch_time']
            } for article in articles])
            
            # 限制历史记录数量
            if len(self.history['fetched_articles']) > 1000:
                self.history['fetched_articles'] = self.history['fetched_articles'][-1000:]
            
            self._save_history()
            
        except Exception as e:
            logger.error(f"保存到JSON库失败: {e}")
    
    def get_library_stats(self) -> Dict:
        """获取JSON库统计信息"""
        try:
            stats = {
                "total_files": 0,
                "total_articles": 0,
                "latest_date": None,
                "files": []
            }
            
            for filename in os.listdir(self.json_library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    filepath = os.path.join(self.json_library_path, filename)
                    
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    date = filename.replace('articles_', '').replace('.json', '')
                    stats['total_files'] += 1
                    stats['total_articles'] += len(data)
                    stats['files'].append({
                        'date': date,
                        'count': len(data),
                        'file': filename
                    })
                    
                    if not stats['latest_date'] or date > stats['latest_date']:
                        stats['latest_date'] = date
            
            return stats
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}
    
    def run(self, fetch_content: bool = False):
        """主运行函数"""
        logger.info("开始自动fetch RSS内容")
        
        all_articles = []
        
        # 遍历所有RSS源
        for rss_url in self.rss_urls:
            logger.info(f"处理RSS源: {rss_url}")
            
            # 获取RSS内容
            rss_content = self.fetch_rss(rss_url)
            if not rss_content:
                continue
            
            # 解析RSS
            source = rss_url.split('/')[-1]
            articles = self.parse_rss(rss_content, source)
            all_articles.extend(articles)
            
            # 可选：获取文章完整内容
            if fetch_content:
                for article in articles:
                    content = self.fetch_article_content(article['link'])
                    if content:
                        article['full_content'] = content
                    time.sleep(1)  # 防止请求过快
            
            time.sleep(1)  # 防止请求过快
        
        # 去重
        unique_articles = self._deduplicate_articles(all_articles)
        logger.info(f"共获取 {len(unique_articles)} 篇唯一文章")
        
        # 保存到JSON库
        if unique_articles:
            self.save_to_json_library(unique_articles)
        
        # 输出统计信息
        stats = self.get_library_stats()
        logger.info(f"JSON库统计: {stats}")
        
        return {
            "articles": unique_articles,
            "count": len(unique_articles),
            "stats": stats
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

if __name__ == "__main__":
    # 本地测试
    fetcher = RSSFetcher()
    result = fetcher.run(fetch_content=False)
    print(f"Fetch完成，共 {result['count']} 篇文章")
    print(f"JSON库统计: {result['stats']}")
