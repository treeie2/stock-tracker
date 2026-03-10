#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号股票研报自动抓取系统 - 云函数版本
功能：定时抓取微信公众号文章，调用Doubao API解析，生成JSON数据并POST到Vercel API
"""

import os
import re
import json
import time
import random
import logging
import requests
from datetime import datetime
from bs4 import BeautifulSoup

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 配置信息（建议从环境变量获取）
class Config:
    # 微信公众号RSS源（可以使用第三方服务如rsshub）
    RSS_FEEDS = [
        "https://rsshub.app/wechat/mp/caixinjingwei",  # 财新经纬
        "https://rsshub.app/wechat/mp/emnews",  # 光大证券研究
        "https://rsshub.app/wechat/mp/ChinaMerchantsSecuritiesResearch",  # 招商证券研究
        "https://rsshub.app/wechat/mp/gfresearch",  # 广发证券研究
        "https://rsshub.app/wechat/mp/hxzqyj"  # 海通证券研究
    ]
    
    # Doubao API 配置
    DOUBAO_API_KEY = os.getenv('DOUBAO_API_KEY', 'your-doubao-api-key')
    DOUBAO_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    
    # Vercel API 配置
    VERCEL_API_URL = os.getenv('VERCEL_API_URL', 'https://stock-tracker-seven-blush.vercel.app/api/wechat-reports')
    
    # 请求配置
    TIMEOUT = 30
    RETRY_TIMES = 3
    RETRY_DELAY = 2

class WeChatCrawler:
    def __init__(self):
        self.config = Config()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
        })
    
    def fetch_rss_feed(self, feed_url):
        """获取RSS源内容"""
        for i in range(self.config.RETRY_TIMES):
            try:
                response = self.session.get(feed_url, timeout=self.config.TIMEOUT)
                response.raise_for_status()
                return response.text
            except Exception as e:
                logger.warning(f"获取RSS源 {feed_url} 失败 ({i+1}/{self.config.RETRY_TIMES}): {e}")
                if i < self.config.RETRY_TIMES - 1:
                    time.sleep(self.config.RETRY_DELAY)
                else:
                    return None
    
    def parse_rss_feed(self, rss_content):
        """解析RSS源，提取文章链接"""
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(rss_content)
            
            # 命名空间处理
            namespaces = {}
            if root.tag.startswith('{'):
                namespace = root.tag.split('}')[0].strip('{')
                namespaces['atom'] = namespace
            
            items = []
            for item in root.findall('.//item'):
                title = item.find('title').text if item.find('title') is not None else ''
                link = item.find('link').text if item.find('link') is not None else ''
                pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ''
                
                # 过滤股票相关文章
                if self._is_stock_related(title):
                    items.append({
                        'title': title,
                        'link': link,
                        'pub_date': pub_date
                    })
            
            return items
        except Exception as e:
            logger.error(f"解析RSS源失败: {e}")
            return []
    
    def _is_stock_related(self, title):
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
    
    def fetch_article_content(self, url):
        """获取文章内容"""
        for i in range(self.config.RETRY_TIMES):
            try:
                response = self.session.get(url, timeout=self.config.TIMEOUT)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 提取文章内容（不同公众号可能有不同的结构）
                content_divs = soup.find_all(['div', 'article'], class_=re.compile(r'(content|rich_media_content|article_content)'))
                
                content = []
                for div in content_divs:
                    # 提取段落文本
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
                logger.warning(f"获取文章内容失败 ({i+1}/{self.config.RETRY_TIMES}): {e}")
                if i < self.config.RETRY_TIMES - 1:
                    time.sleep(self.config.RETRY_DELAY)
                else:
                    return ""
    
    def call_doubao_api(self, content):
        """调用Doubao API解析文章内容"""
        try:
            prompt = f"""你是一个专业的股票研报分析师，请从以下文章中提取股票相关信息：

文章内容：
{content[:3000]}...  # 限制长度

请按照以下JSON格式返回解析结果：
{
  "stocks": [
    {
      "stockName": "股票名称",
      "stockCode": "股票代码（6位数字）",
      "title": "研报标题",
      "logic": "投资逻辑",
      "date": "研报日期",
      "sector": "所属行业",
      "concepts": ["概念1", "概念2"],
      "targetValuation": "目标估值",
      "dataPoints": [
        {"label": "数据标签", "value": "数据值"}
      ]
    }
  ]
}

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
                "Authorization": f"Bearer {self.config.DOUBAO_API_KEY}"
            }
            
            response = requests.post(
                self.config.DOUBAO_API_URL,
                json=payload,
                headers=headers,
                timeout=self.config.TIMEOUT
            )
            
            response.raise_for_status()
            result = response.json()
            
            # 提取解析结果
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                
                # 清理JSON格式（移除可能的Markdown标记）
                content = re.sub(r'^```json|```$', '', content, flags=re.MULTILINE).strip()
                
                return json.loads(content)
            
            return {"stocks": []}
        except Exception as e:
            logger.error(f"调用Doubao API失败: {e}")
            return {"stocks": []}
    
    def post_to_vercel(self, data):
        """将解析结果POST到Vercel API"""
        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.config.VERCEL_API_URL,
                json=data,
                headers=headers,
                timeout=self.config.TIMEOUT
            )
            
            response.raise_for_status()
            result = response.json()
            logger.info(f"POST到Vercel成功: {result}")
            return True
        except Exception as e:
            logger.error(f"POST到Vercel失败: {e}")
            return False
    
    def run(self):
        """主运行函数"""
        logger.info("开始执行微信公众号股票研报抓取任务")
        
        all_stocks = []
        
        # 遍历所有RSS源
        for feed_url in self.config.RSS_FEEDS:
            logger.info(f"处理RSS源: {feed_url}")
            
            # 获取RSS内容
            rss_content = self.fetch_rss_feed(feed_url)
            if not rss_content:
                continue
            
            # 解析RSS内容
            items = self.parse_rss_feed(rss_content)
            logger.info(f"从 {feed_url} 发现 {len(items)} 篇股票相关文章")
            
            # 处理每篇文章
            for item in items:
                logger.info(f"处理文章: {item['title']}")
                
                # 获取文章内容
                content = self.fetch_article_content(item['link'])
                if not content:
                    logger.warning(f"无法获取文章内容: {item['title']}")
                    continue
                
                # 调用Doubao API解析
                parsed_data = self.call_doubao_api(content)
                
                # 合并结果
                if "stocks" in parsed_data and parsed_data["stocks"]:
                    all_stocks.extend(parsed_data["stocks"])
                
                # 防止请求过快
                time.sleep(random.uniform(1, 3))
        
        # 去重处理
        unique_stocks = self._deduplicate_stocks(all_stocks)
        logger.info(f"共解析到 {len(unique_stocks)} 个股票标的")
        
        # 构建最终数据
        final_data = {
            "stocks": unique_stocks,
            "crawled_at": datetime.now().isoformat()
        }
        
        # 保存到本地（可选）
        with open('wechat_reports.json', 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        
        # POST到Vercel
        if unique_stocks:
            self.post_to_vercel(final_data)
        
        logger.info("微信公众号股票研报抓取任务执行完成")
    
    def _deduplicate_stocks(self, stocks):
        """去重股票列表"""
        seen = set()
        unique = []
        
        for stock in stocks:
            # 基于股票名称和标题去重
            key = f"{stock.get('stockName', '')}_{stock.get('title', '')}"
            if key not in seen:
                seen.add(key)
                unique.append(stock)
        
        return unique

# 云函数入口
def main(event, context):
    """云函数入口函数"""
    try:
        crawler = WeChatCrawler()
        crawler.run()
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "微信公众号股票研报抓取任务执行成功"})
        }
    except Exception as e:
        logger.error(f"云函数执行失败: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "微信公众号股票研报抓取任务执行失败", "error": str(e)})
        }

if __name__ == "__main__":
    # 本地测试
    crawler = WeChatCrawler()
    crawler.run()
