# 微信公众号RSS自动fetch系统

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                   微信公众号RSS自动fetch系统                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─→ 1. RSS生成服务 (wechat_rss_generator.py)
                              │   └─→ 将微信公众号文章转换为RSS格式
                              │
                              ├─→ 2. 自动fetch服务 (rss_fetcher.py)
                              │   └─→ 定期从RSS源获取内容
                              │
                              ├─→ 3. JSON库存储系统 (json_library.py)
                              │   └─→ 管理、查询、分析存储的JSON数据
                              │
                              └─→ 4. 综合云函数 (wechat_rss_auto_fetch.py)
                                  └─→ 集成所有组件，推送到Vercel应用
```

## 功能说明

### 1. RSS生成服务 (wechat_rss_generator.py)
- 从多个财经微信公众号获取文章
- 过滤股票相关文章
- 生成RSS XML格式
- 生成JSON格式数据
- 保存到本地文件

### 2. 自动fetch服务 (rss_fetcher.py)
- 定期从RSS源获取内容
- 解析RSS XML格式
- 提取文章标题、链接、描述等
- 可选：获取文章完整内容
- 保存到JSON库

### 3. JSON库存储系统 (json_library.py)
- 管理存储的JSON数据
- 按日期、来源、关键词查询
- 提供统计分析功能
- 支持数据导出
- 自动清理旧数据

### 4. 综合云函数 (wechat_rss_auto_fetch.py)
- 集成所有组件
- 自动fetch RSS内容
- 使用Doubao API分析文章
- 推送到Vercel应用
- 支持定时触发

## 快速开始

### 1. 安装依赖

```bash
pip install requests beautifulsoup4
```

### 2. 配置环境变量

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `DOUBAO_API_KEY` | 豆包API密钥 | `your-doubao-api-key` |
| `VERCEL_API_URL` | Vercel API地址 | `https://stock-tracker-seven-blush.vercel.app/api/wechat-reports` |

### 3. 本地测试

#### 测试RSS生成服务
```bash
python scripts/wechat_rss_generator.py
```

#### 测试自动fetch服务
```bash
python scripts/rss_fetcher.py
```

#### 测试JSON库存储系统
```bash
python scripts/json_library.py
```

#### 测试综合云函数
```bash
python scripts/wechat_rss_auto_fetch.py
```

## 部署云函数

### 腾讯云函数部署步骤：

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云函数** 服务
3. 创建新函数，选择 **Python 3.9** 运行环境
4. 将以下文件上传到函数代码：
   - `rss_fetcher.py`
   - `json_library.py`
   - `wechat_rss_auto_fetch.py`
5. 配置环境变量
6. 设置定时触发器，推荐每天7点和21点执行
7. 保存并部署

## 使用示例

### 1. 单独使用RSS生成服务

```python
from wechat_rss_generator import WeChatRSSGenerator

generator = WeChatRSSGenerator()
result = generator.run()

print(f"生成完成，共 {result['count']} 篇文章")
```

### 2. 单独使用自动fetch服务

```python
from rss_fetcher import RSSFetcher

fetcher = RSSFetcher()
result = fetcher.run(fetch_content=False)

print(f"Fetch完成，共 {result['count']} 篇文章")
```

### 3. 使用JSON库存储系统

```python
from json_library import JSONLibrary

library = JSONLibrary()

# 获取统计信息
stats = library.get_statistics()
print(f"库统计: {stats}")

# 获取最近7天的文章
recent_articles = library.get_recent_articles(7)
print(f"最近7天文章数: {len(recent_articles)}")

# 搜索文章
search_results = library.search_articles("股票")
print(f"搜索'股票'结果数: {len(search_results)}")

# 导出数据
library.export_to_json("library_export.json")
```

### 4. 使用综合云函数

```python
from wechat_rss_auto_fetch import WeChatRSSAutoFetch

auto_fetch = WeChatRSSAutoFetch()
result = auto_fetch.run(analyze=True, push=True)

print(f"执行完成: {result}")
```

## 数据结构

### RSS文章格式

```json
{
  "title": "文章标题",
  "link": "文章链接",
  "description": "文章描述",
  "pub_date": "发布日期",
  "source": "来源",
  "fetch_time": "抓取时间"
}
```

### 分析后的研报格式

```json
{
  "stockName": "股票名称",
  "stockCode": "股票代码",
  "title": "研报标题",
  "logic": "投资逻辑",
  "date": "研报日期",
  "sector": "所属行业",
  "concepts": ["概念1", "概念2"],
  "targetValuation": "目标估值",
  "dataPoints": [
    {"label": "数据标签", "value": "数据值"}
  ],
  "source": "来源",
  "original_link": "原始链接",
  "fetch_time": "抓取时间"
}
```

## JSON库结构

```
json_library/
├── articles_2026-02-09.json    # 按日期存储的文章
├── articles_2026-02-08.json
├── library_index.json          # 索引文件
└── ...
```

### 索引文件格式

```json
{
  "last_updated": "2026-02-09T10:00:00Z",
  "total_articles": 1000,
  "sources": {
    "caixinjingwei": 200,
    "emnews": 180
  },
  "dates": {
    "2026-02-09": 50,
    "2026-02-08": 45
  },
  "keywords": {
    "股票": 800,
    "研报": 600
  }
}
```

## 常见问题

### 1. RSS源无法访问

**解决方案**：
- 检查网络连接
- 尝试更换RSS源
- 使用代理服务器

### 2. Doubao API调用失败

**解决方案**：
- 检查API密钥是否正确
- 确保网络连接正常
- 调整API调用频率

### 3. Vercel API返回错误

**解决方案**：
- 检查Vercel应用是否正常运行
- 验证请求数据格式是否正确
- 查看Vercel日志了解具体错误原因

### 4. JSON库数据过大

**解决方案**：
- 定期清理旧数据
- 使用`clean_old_data`方法
- 调整存储策略

## 扩展功能

### 1. 添加更多RSS源

在`wechat_rss_auto_fetch.py`中修改`rss_urls`列表：

```python
self.rss_urls = [
    "https://rsshub.app/wechat/mp/caixinjingwei",
    "https://rsshub.app/wechat/mp/emnews",
    # 添加更多RSS源
    "https://your-custom-rss-source.com"
]
```

### 2. 自定义分析逻辑

修改`_call_doubao_api`方法中的prompt，自定义分析逻辑。

### 3. 添加数据可视化

在前端应用中添加数据可视化功能，展示：
- 文章数量趋势
- 来源分布
- 关键词统计

### 4. 邮件通知

当抓取到重要文章时，发送邮件通知：

```python
import smtplib
from email.mime.text import MIMEText

def send_email_notification(article):
    # 实现邮件发送逻辑
    pass
```

## 技术栈

- **语言**：Python 3.9+
- **HTTP请求**：requests
- **HTML解析**：BeautifulSoup4
- **XML解析**：xml.etree.ElementTree
- **AI分析**：Doubao API
- **部署平台**：腾讯云函数
- **前端应用**：React, TypeScript, Vercel

## 注意事项

1. **合规性**：请遵守相关平台的使用条款，不要过度抓取导致服务器压力
2. **API费用**：Doubao API调用可能产生费用，请关注使用量
3. **数据准确性**：AI解析结果可能存在误差，请人工验证重要信息
4. **隐私保护**：不要抓取和存储敏感信息
5. **存储空间**：定期清理旧数据，避免占用过多存储空间

## 性能优化

1. **并发处理**：使用多线程或异步IO提高fetch效率
2. **缓存机制**：缓存已解析的文章，避免重复处理
3. **增量更新**：只处理新增或更新的文章
4. **压缩存储**：使用gzip压缩JSON文件

## 监控和日志

- 使用腾讯云函数的日志功能监控系统运行状态
- 设置告警规则，及时发现问题
- 定期检查JSON库的存储情况

## 许可证

本项目仅供学习和研究使用，请勿用于商业用途。
