#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号RSS自动fetch系统 - 云函数版本
功能：定期从RSS源获取内容，解析并存储到JSON库，推送到Vercel应用
"""

import os
import json
import time
import logging
import requests
from datetime import datetime
from typing import List, Dict, Optional
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

# 导入自定义模块
from rss_fetcher import RSSFetcher
from json_library import JSONLibrary

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WeChatRSSAutoFetch:
    def __init__(self):
        # RSS源配置
        self.rss_urls = [
            "https://rsshub.app/wechat/mp/caixinjingwei",
            "https://rsshub.app/wechat/mp/emnews",
            "https://rsshub.app/wechat/mp/ChinaMerchantsSecuritiesResearch",
            "https://rsshub.app/wechat/mp/gfresearch",
            "https://rsshub.app/wechat/mp/hxzqyj"
        ]
        
        # JSON库
        self.library = JSONLibrary("json_library")
        
        # Vercel API配置
        self.vercel_api_url = os.getenv('VERCEL_API_URL', 'https://stock-tracker-seven-blush.vercel.app/api/wechat-reports')
        
        # Doubao API配置
        self.doubao_api_key = os.getenv('DOUBAO_API_KEY', 'your-doubao-api-key')
        self.doubao_api_url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
        
        # 请求配置
        self.timeout = 30
        self.retry_times = 3
        self.retry_delay = 2
    
    def fetch_and_store(self) -> Dict:
        """获取并存储RSS内容"""
        logger.info("开始获取RSS内容")
        
        fetcher = RSSFetcher()
        result = fetcher.run(fetch_content=False)
        
        # 存储到JSON库
        if result['articles']:
            self.library.add_articles(result['articles'])
        
        return result
    
    def analyze_articles(self, articles: List[Dict]) -> List[Dict]:
        """使用Doubao API分析文章"""
        logger.info(f"开始分析 {len(articles)} 篇文章")
        
        analyzed_articles = []
        
        for article in articles:
            try:
                # 调用Doubao API
                analyzed = self._call_doubao_api(article)
                if analyzed:
                    analyzed_articles.append(analyzed)
                
                # 防止请求过快
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"分析文章失败: {e}")
                continue
        
        logger.info(f"成功分析 {len(analyzed_articles)} 篇文章")
        return analyzed_articles
    
    def _call_doubao_api(self, article: Dict) -> Optional[Dict]:
        """调用Doubao API分析单篇文章"""
        try:
            prompt = f"""你是一个专业的股票研报分析师，请从以下文章中提取股票相关信息：

文章标题：{article['title']}
文章描述：{article.get('description', '')}

请按照以下JSON格式返回解析结果：
{{
  "stockName": "股票名称",
  "stockCode": "股票代码（6位数字）",
  "title": "研报标题",
  "logic": "投资逻辑",
  "date": "研报日期",
  "sector": "所属行业",
  "concepts": ["概念1", "概念2"],
  "targetValuation": "目标估值",
  "dataPoints": [
    {{"label": "数据标签", "value": "数据值"}}
  ]
}}

注意：
1. 只提取明确提到的股票
2. 如果没有股票代码，请留空字符串
3. 确保返回的是有效的JSON格式
4. 不要包含任何额外的解释文本
"""
            
            payload = {
                "model": "ep-20240520175146-nqkt6",
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个专业的股票研报分析师，擅长从文章中提取股票相关信息。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.doubao_api_key}"
            }
            
            response = requests.post(
                self.doubao_api_url,
                json=payload,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            result = response.json()
            
            # 提取解析结果
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                
                # 清理JSON格式
                import re
                content = re.sub(r'^```json|```$', '', content, flags=re.MULTILINE).strip()
                
                parsed_data = json.loads(content)
                
                # 添加原始文章信息
                parsed_data['source'] = article.get('source', '')
                parsed_data['original_link'] = article.get('link', '')
                parsed_data['fetch_time'] = article.get('fetch_time', '')
                
                return parsed_data
            
            return None
            
        except Exception as e:
            logger.error(f"调用Doubao API失败: {e}")
            return None
    
    def push_to_vercel(self, analyzed_articles: List[Dict]) -> bool:
        """推送到Vercel应用"""
        try:
            data = {
                "stocks": analyzed_articles,
                "crawled_at": datetime.now().isoformat(),
                "source": "wechat_rss_auto_fetch"
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.vercel_api_url,
                json=data,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"成功推送到Vercel: {result}")
            return True
            
        except Exception as e:
            logger.error(f"推送到Vercel失败: {e}")
            return False
    
    def run(self, analyze: bool = True, push: bool = True) -> Dict:
        """主运行函数"""
        logger.info("开始执行微信公众号RSS自动fetch任务")
        
        # 1. 获取并存储RSS内容
        fetch_result = self.fetch_and_store()
        
        # 2. 分析文章
        analyzed_articles = []
        if analyze and fetch_result['articles']:
            analyzed_articles = self.analyze_articles(fetch_result['articles'])
        
        # 3. 推送到Vercel
        if push and analyzed_articles:
            self.push_to_vercel(analyzed_articles)
        
        # 4. 获取统计信息
        stats = self.library.get_statistics()
        
        result = {
            "fetched_articles": len(fetch_result['articles']),
            "analyzed_articles": len(analyzed_articles),
            "pushed_to_vercel": push and len(analyzed_articles) > 0,
            "library_stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"任务执行完成: {result}")
        return result

# 云函数入口
def main(event, context):
    """云函数入口函数"""
    try:
        auto_fetch = WeChatRSSAutoFetch()
        result = auto_fetch.run(analyze=True, push=True)
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "微信公众号RSS自动fetch任务执行成功",
                "result": result
            })
        }
    except Exception as e:
        logger.error(f"云函数执行失败: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "微信公众号RSS自动fetch任务执行失败",
                "error": str(e)
            })
        }

if __name__ == "__main__":
    # 本地测试
    auto_fetch = WeChatRSSAutoFetch()
    result = auto_fetch.run(analyze=False, push=False)
    print(f"执行完成: {json.dumps(result, ensure_ascii=False, indent=2)}")
