#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSON库存储系统
功能：管理、查询、分析存储的JSON数据
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from collections import defaultdict

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class JSONLibrary:
    def __init__(self, library_path: str = "json_library"):
        self.library_path = library_path
        os.makedirs(library_path, exist_ok=True)
        
        # 索引文件
        self.index_file = os.path.join(library_path, "library_index.json")
        self.index = self._load_index()
    
    def _load_index(self) -> Dict:
        """加载索引"""
        try:
            if os.path.exists(self.index_file):
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"加载索引失败: {e}")
        
        return {
            "last_updated": None,
            "total_articles": 0,
            "sources": {},
            "dates": {},
            "keywords": {}
        }
    
    def _save_index(self):
        """保存索引"""
        try:
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(self.index, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存索引失败: {e}")
    
    def add_articles(self, articles: List[Dict], date: str = None):
        """添加文章到库"""
        if not date:
            date = datetime.now().strftime('%Y-%m-%d')
        
        try:
            # 保存文章
            file_path = os.path.join(self.library_path, f"articles_{date}.json")
            
            # 加载现有数据
            existing_data = []
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            
            # 合并数据
            existing_articles = {article['title']: article for article in existing_data}
            for article in articles:
                existing_articles[article['title']] = article
            
            # 保存
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(list(existing_articles.values()), f, ensure_ascii=False, indent=2)
            
            # 更新索引
            self._update_index(articles, date)
            
            logger.info(f"已添加 {len(articles)} 篇文章到库，日期: {date}")
            
        except Exception as e:
            logger.error(f"添加文章到库失败: {e}")
    
    def _update_index(self, articles: List[Dict], date: str):
        """更新索引"""
        self.index['last_updated'] = datetime.now().isoformat()
        self.index['total_articles'] += len(articles)
        
        # 更新来源索引
        for article in articles:
            source = article.get('source', 'unknown')
            if source not in self.index['sources']:
                self.index['sources'][source] = 0
            self.index['sources'][source] += 1
        
        # 更新日期索引
        if date not in self.index['dates']:
            self.index['dates'][date] = 0
        self.index['dates'][date] += len(articles)
        
        # 更新关键词索引
        for article in articles:
            title = article.get('title', '')
            keywords = self._extract_keywords(title)
            for keyword in keywords:
                if keyword not in self.index['keywords']:
                    self.index['keywords'][keyword] = 0
                self.index['keywords'][keyword] += 1
        
        self._save_index()
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        stock_keywords = [
            "股票", "研报", "投资", "行情", "分析", "策略", "板块", 
            "个股", "财报", "业绩", "估值", "推荐", "评级", "目标价"
        ]
        
        keywords = []
        for keyword in stock_keywords:
            if keyword in text:
                keywords.append(keyword)
        
        return keywords
    
    def get_all_articles(self) -> List[Dict]:
        """获取所有文章"""
        all_articles = []
        
        try:
            for filename in os.listdir(self.library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    file_path = os.path.join(self.library_path, filename)
                    
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    all_articles.extend(data)
        
        except Exception as e:
            logger.error(f"获取所有文章失败: {e}")
        
        return all_articles
    
    def get_articles_by_date(self, date: str) -> List[Dict]:
        """按日期获取文章"""
        try:
            file_path = os.path.join(self.library_path, f"articles_{date}.json")
            
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        except Exception as e:
            logger.error(f"按日期获取文章失败: {e}")
        
        return []
    
    def get_articles_by_source(self, source: str) -> List[Dict]:
        """按来源获取文章"""
        all_articles = self.get_all_articles()
        
        return [article for article in all_articles if article.get('source') == source]
    
    def search_articles(self, keyword: str) -> List[Dict]:
        """搜索文章"""
        all_articles = self.get_all_articles()
        
        results = []
        for article in all_articles:
            title = article.get('title', '').lower()
            description = article.get('description', '').lower()
            
            if keyword.lower() in title or keyword.lower() in description:
                results.append(article)
        
        return results
    
    def get_statistics(self) -> Dict:
        """获取统计信息"""
        try:
            stats = {
                "total_articles": self.index['total_articles'],
                "total_files": 0,
                "total_sources": len(self.index['sources']),
                "total_dates": len(self.index['dates']),
                "last_updated": self.index['last_updated'],
                "sources": self.index['sources'],
                "dates": self.index['dates'],
                "top_keywords": sorted(
                    self.index['keywords'].items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10]
            }
            
            # 统计文件数量
            for filename in os.listdir(self.library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    stats['total_files'] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}
    
    def get_recent_articles(self, days: int = 7) -> List[Dict]:
        """获取最近N天的文章"""
        recent_articles = []
        today = datetime.now()
        
        for i in range(days):
            date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            articles = self.get_articles_by_date(date)
            recent_articles.extend(articles)
        
        return recent_articles
    
    def export_to_json(self, output_file: str = "library_export.json"):
        """导出整个库到JSON文件"""
        try:
            all_articles = self.get_all_articles()
            
            export_data = {
                "export_time": datetime.now().isoformat(),
                "statistics": self.get_statistics(),
                "articles": all_articles
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"已导出 {len(all_articles)} 篇文章到 {output_file}")
            
            return export_data
            
        except Exception as e:
            logger.error(f"导出库失败: {e}")
            return None
    
    def clean_old_data(self, days: int = 30):
        """清理旧数据"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            deleted_files = []
            
            for filename in os.listdir(self.library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    date_str = filename.replace('articles_', '').replace('.json', '')
                    try:
                        file_date = datetime.strptime(date_str, '%Y-%m-%d')
                        
                        if file_date < cutoff_date:
                            file_path = os.path.join(self.library_path, filename)
                            os.remove(file_path)
                            deleted_files.append(filename)
                            logger.info(f"已删除旧数据文件: {filename}")
                    
                    except ValueError:
                        continue
            
            # 更新索引
            if deleted_files:
                self._rebuild_index()
            
            return deleted_files
            
        except Exception as e:
            logger.error(f"清理旧数据失败: {e}")
            return []
    
    def _rebuild_index(self):
        """重建索引"""
        try:
            self.index = {
                "last_updated": None,
                "total_articles": 0,
                "sources": {},
                "dates": {},
                "keywords": {}
            }
            
            all_articles = self.get_all_articles()
            
            for article in all_articles:
                source = article.get('source', 'unknown')
                if source not in self.index['sources']:
                    self.index['sources'][source] = 0
                self.index['sources'][source] += 1
                
                keywords = self._extract_keywords(article.get('title', ''))
                for keyword in keywords:
                    if keyword not in self.index['keywords']:
                        self.index['keywords'][keyword] = 0
                    self.index['keywords'][keyword] += 1
            
            self.index['total_articles'] = len(all_articles)
            self.index['last_updated'] = datetime.now().isoformat()
            
            # 更新日期索引
            for filename in os.listdir(self.library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    date_str = filename.replace('articles_', '').replace('.json', '')
                    file_path = os.path.join(self.library_path, filename)
                    
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    self.index['dates'][date_str] = len(data)
            
            self._save_index()
            
        except Exception as e:
            logger.error(f"重建索引失败: {e}")

if __name__ == "__main__":
    # 本地测试
    library = JSONLibrary()
    
    # 获取统计信息
    stats = library.get_statistics()
    print(f"库统计: {json.dumps(stats, ensure_ascii=False, indent=2)}")
    
    # 获取最近7天的文章
    recent_articles = library.get_recent_articles(7)
    print(f"最近7天文章数: {len(recent_articles)}")
    
    # 搜索文章
    search_results = library.search_articles("股票")
    print(f"搜索'股票'结果数: {len(search_results)}")
