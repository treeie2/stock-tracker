# 微信公众号股票研报自动抓取系统

## 系统架构

```
┌─────────────┐
│ 腾讯云函数   │ ← 定时触发 (每天7点/21点)
│  (Python)   │
└──────┬──────┘
       │
       ├→ 1. 抓取公众号文章 (RSS/网页)
       │
       ├→ 2. 调用doubao API解析
       │
       ├→ 3. 生成JSON数据
       │
       └→ 4. POST到Vercel API
              │
              ↓
       ┌──────────────┐
       │  Vercel App  │
       │  接收并保存   │
       └──────────────┘
              │
              ↓
       ┌──────────────┐
       │  前端展示    │
       └──────────────┘
```

## 功能说明

1. **自动抓取**：定时从多个财经微信公众号抓取股票研报相关文章
2. **智能解析**：调用Doubao API自动提取文章中的股票信息、投资逻辑、估值等
3. **数据结构化**：将解析结果转换为标准JSON格式
4. **自动同步**：将结构化数据POST到Vercel应用
5. **前端展示**：在Vercel应用中查看和管理抓取的研报数据

## 快速开始

### 1. 配置环境变量

在云函数环境中设置以下环境变量：

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `DOUBAO_API_KEY` | 豆包API密钥 | `075dca3e-090d-4085-bfbd-0d0b8b5cc316` |
| `VERCEL_API_URL` | Vercel API地址 | `https://stock-tracker-seven-blush.vercel.app/api/wechat-reports` |

### 2. 部署云函数

#### 腾讯云函数部署步骤：

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云函数** 服务
3. 创建新函数，选择 **Python 3.9** 运行环境
4. 将 `scripts/wechat_crawler_cloud_function.py` 内容复制到函数代码
5. 配置环境变量
6. 设置定时触发器，推荐每天7点和21点执行
7. 保存并部署

### 3. 配置Vercel API

#### 已部署的API端点：

- **POST** `https://stock-tracker-seven-blush.vercel.app/api/wechat-reports`
  - 接收微信公众号研报数据
  - 请求体格式：
    ```json
    {
      "stocks": [
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
          ]
        }
      ],
      "crawled_at": "2026-02-09T10:00:00Z"
    }
    ```

- **GET** `https://stock-tracker-seven-blush.vercel.app/api/wechat-reports`
  - 获取已保存的研报数据

### 4. 配置RSS源

在 `wechat_crawler_cloud_function.py` 文件中，您可以修改 `RSS_FEEDS` 列表，添加或删除微信公众号：

```python
RSS_FEEDS = [
    "https://rsshub.app/wechat/mp/caixinjingwei",  # 财新经纬
    "https://rsshub.app/wechat/mp/emnews",  # 光大证券研究
    "https://rsshub.app/wechat/mp/ChinaMerchantsSecuritiesResearch",  # 招商证券研究
    "https://rsshub.app/wechat/mp/gfresearch",  # 广发证券研究
    "https://rsshub.app/wechat/mp/hxzqyj"  # 海通证券研究
]
```

### 5. 本地测试

在本地运行抓取脚本：

```bash
# 安装依赖
pip install requests beautifulsoup4

# 设置环境变量
export DOUBAO_API_KEY="your-doubao-api-key"
export VERCEL_API_URL="https://stock-tracker-seven-blush.vercel.app/api/wechat-reports"

# 运行脚本
python scripts/wechat_crawler_cloud_function.py
```

## 数据处理流程

1. **抓取阶段**：从RSS源获取微信公众号文章链接
2. **过滤阶段**：根据标题关键词过滤股票相关文章
3. **解析阶段**：调用Doubao API提取股票信息
4. **结构化阶段**：将解析结果转换为标准JSON格式
5. **同步阶段**：将数据POST到Vercel API
6. **存储阶段**：Vercel应用将数据保存到localStorage和IndexedDB

## 常见问题

### 1. 云函数执行超时

**解决方案**：
- 减少RSS源数量
- 增加云函数超时时间（建议设置为600秒）
- 优化抓取逻辑，增加并发处理

### 2. Doubao API调用失败

**解决方案**：
- 检查API密钥是否正确
- 确保网络连接正常
- 调整API调用频率，避免触发限流

### 3. Vercel API返回错误

**解决方案**：
- 检查Vercel应用是否正常运行
- 验证请求数据格式是否正确
- 查看Vercel日志了解具体错误原因

### 4. 抓取的文章数量较少

**解决方案**：
- 添加更多RSS源
- 调整关键词过滤逻辑
- 检查RSS源是否正常更新

## 扩展功能

### 1. 添加更多数据源

可以扩展脚本，支持从其他财经网站抓取研报：

- 雪球网
- 东方财富网
- 同花顺
- 新浪财经

### 2. 增加数据可视化

在前端应用中添加研报数据可视化功能：

- 研报数量趋势图
- 行业分布饼图
- 股票热度排行榜

### 3. 添加邮件通知

当抓取到重要研报时，发送邮件通知：

- 配置SMTP服务器
- 设置通知阈值
- 自定义邮件模板

## 技术栈

- **云函数**：Python 3.9
- **抓取工具**：requests, BeautifulSoup4
- **AI解析**：Doubao API
- **部署平台**：腾讯云函数
- **前端应用**：React, TypeScript, Vercel
- **数据存储**：localStorage, IndexedDB

## 注意事项

1. **合规性**：请遵守相关平台的使用条款，不要过度抓取导致服务器压力
2. **API费用**：Doubao API调用可能产生费用，请关注使用量
3. **数据准确性**：AI解析结果可能存在误差，请人工验证重要信息
4. **隐私保护**：不要抓取和存储敏感信息

## 许可证

本项目仅供学习和研究使用，请勿用于商业用途。
