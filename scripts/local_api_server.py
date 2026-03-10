#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地API服务器
提供JSON库数据的HTTP接口
"""

import os
import json
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

class JSONLibraryHandler(BaseHTTPRequestHandler):
    """处理JSON库数据的HTTP请求"""
    
    def __init__(self, *args, **kwargs):
        self.json_library_path = os.path.join(os.path.dirname(__file__), 'json_library')
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """处理GET请求"""
        # 解析请求路径和参数
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)
        
        # 处理不同的API端点
        if path == '/api/json-library':
            self._handle_json_library(query_params)
        else:
            self._send_error(404, 'Not Found')
    
    def _handle_json_library(self, query_params):
        """处理JSON库相关请求"""
        try:
            # 获取action参数
            action = query_params.get('action', ['stats'])[0]
            
            if action == 'stats':
                self._get_stats()
            elif action == 'articles':
                self._get_articles(query_params)
            elif action == 'search':
                self._search_articles(query_params)
            else:
                self._send_error(400, 'Invalid action')
                
        except Exception as e:
            print(f'处理请求失败: {e}')
            self._send_error(500, f'Internal Server Error: {str(e)}')
    
    def _get_stats(self):
        """获取JSON库统计信息"""
        try:
            stats = {
                "total_files": 0,
                "total_articles": 0,
                "total_sources": 0,
                "total_dates": 0,
                "latest_date": None,
                "sources": set()
            }
            
            dates = []
            
            for filename in os.listdir(self.json_library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    filepath = os.path.join(self.json_library_path, filename)
                    
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    date = filename.replace('articles_', '').replace('.json', '')
                    dates.append(date)
                    stats['total_files'] += 1
                    stats['total_articles'] += len(data)
                    
                    # 收集来源
                    for article in data:
                        if 'source' in article:
                            stats['sources'].add(article['source'])
            
            # 计算来源数和日期数
            stats['total_sources'] = len(stats['sources'])
            stats['total_dates'] = len(dates)
            
            # 找出最新日期
            if dates:
                stats['latest_date'] = max(dates)
            
            # 移除sources集合，因为JSON不能序列化集合
            del stats['sources']
            
            self._send_json({
                "success": True,
                "stats": stats
            })
            
        except Exception as e:
            print(f'获取统计信息失败: {e}')
            self._send_error(500, f'Failed to get stats: {str(e)}')
    
    def _get_articles(self, query_params):
        """获取文章列表"""
        try:
            date = query_params.get('date', [None])[0]
            source = query_params.get('source', [None])[0]
            
            articles = []
            
            if date:
                # 按日期获取文章
                file_path = os.path.join(self.json_library_path, f"articles_{date}.json")
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        articles = json.load(f)
            else:
                # 获取所有文章
                for filename in os.listdir(self.json_library_path):
                    if filename.startswith('articles_') and filename.endswith('.json'):
                        file_path = os.path.join(self.json_library_path, filename)
                        with open(file_path, 'r', encoding='utf-8') as f:
                            file_articles = json.load(f)
                        articles.extend(file_articles)
            
            # 按来源过滤
            if source:
                articles = [article for article in articles if article.get('source') == source]
            
            self._send_json({
                "success": True,
                "articles": articles,
                "count": len(articles)
            })
            
        except Exception as e:
            print(f'获取文章失败: {e}')
            self._send_error(500, f'Failed to get articles: {str(e)}')
    
    def _search_articles(self, query_params):
        """搜索文章"""
        try:
            keyword = query_params.get('keyword', [None])[0]
            
            if not keyword:
                self._send_error(400, 'Missing keyword parameter')
                return
            
            # 获取所有文章
            all_articles = []
            for filename in os.listdir(self.json_library_path):
                if filename.startswith('articles_') and filename.endswith('.json'):
                    file_path = os.path.join(self.json_library_path, filename)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_articles = json.load(f)
                    all_articles.extend(file_articles)
            
            # 搜索关键词
            results = []
            keyword_lower = keyword.lower()
            
            for article in all_articles:
                title = article.get('title', '').lower()
                description = article.get('description', '').lower()
                
                if keyword_lower in title or keyword_lower in description:
                    results.append(article)
            
            self._send_json({
                "success": True,
                "articles": results,
                "count": len(results),
                "keyword": keyword
            })
            
        except Exception as e:
            print(f'搜索文章失败: {e}')
            self._send_error(500, f'Failed to search articles: {str(e)}')
    
    def _send_json(self, data):
        """发送JSON响应"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # 允许跨域请求
        self.end_headers()
        
        response = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.wfile.write(response)
    
    def _send_error(self, status_code, message):
        """发送错误响应"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # 允许跨域请求
        self.end_headers()
        
        error_response = json.dumps({
            "success": False,
            "error": message
        }, ensure_ascii=False).encode('utf-8')
        self.wfile.write(error_response)

def run_server(port=3003):
    """运行API服务器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, JSONLibraryHandler)
    
    print(f'本地API服务器启动，运行在 http://localhost:{port}')
    print('提供以下API端点:')
    print('  GET /api/json-library?action=stats - 获取JSON库统计信息')
    print('  GET /api/json-library?action=articles - 获取所有文章')
    print('  GET /api/json-library?action=articles&date=2026-02-09 - 按日期获取文章')
    print('  GET /api/json-library?action=articles&source=beita-cycle - 按来源获取文章')
    print('  GET /api/json-library?action=search&keyword=科技 - 搜索文章')
    print('按 Ctrl+C 停止服务器')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器正在关闭...')
        httpd.shutdown()
        print('服务器已关闭')

if __name__ == '__main__':
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='本地JSON库API服务器')
    parser.add_argument('--port', type=int, default=3003, help='服务器端口')
    args = parser.parse_args()
    
    # 运行服务器
    run_server(args.port)
