import type { ExtractedInfo } from "./types/index";
import { batchSearchStocks, type StockBasicInfo } from "./stockDatabase";

export interface ExtractionResult {
  data: ExtractedInfo[];
  sources: { title: string; uri: string }[];
  stockInfoMap?: Map<string, StockBasicInfo | null>;
}

/**
 * 使用豆包 (Doubao) 大模型进行文本结构化解析
 * 适配火山引擎 Ark API (V3 Chat Completions 接口)
 */
export async function extractStockInfoFromText(text: string): Promise<ExtractionResult> {
  // 使用用户提供的 API Key
  const API_KEY = '075dca3e-090d-4085-bfbd-0d0b8b5cc316';
  const ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const MODEL = "doubao-1-5-pro-32k-250115";

  const systemPrompt = `你是一个专业的投研数据助理。
任务：从提供的研报文本中提取所有个股信息。

【重要要求】
1. 必须返回一个 JSON 数组，即使只有1个股票也要用数组格式 [ {...} ]
2. 如果文本包含多个股票，每个股票都要作为数组的一个独立元素
3. 每个股票对象必须包含以下字段：
   - stockName: 股票名称（必须准确，从文本中提取）
   - stockCode: 6位数字股票代码（如 300593、002460）
     * 如果文本中包含股票代码，请准确提取
     * 如果文本中没有股票代码，设置为 ""
   - title: 研报标题
   - logic: 投资逻辑/核心观点（完整提取）
   - date: 研报日期 (YYYY.MM.DD 格式)
   - sector: 所属行业板块（根据业务内容推断）
   - concepts: 相关概念数组（如 ["新能源", "储能"]）
   - targetValuation: 目标估值（如有）
   - dataPoints: 关键数据点数组 [{label, value}]

4. 仅输出 JSON 数组字符串，不要包含任何解释或 Markdown 代码块标记（不要包含 \`\`\`json）
5. 确保每个股票都有独立的 stockCode 和 stockName，不要合并不同股票的信息`;

  const userPrompt = `请从以下研报文本中提取所有股票信息，返回 JSON 数组格式：

${text}

注意：
- 如果有多个股票，每个股票都要作为数组的一个独立元素
- stockCode 必须是6位数字，如果文本中没有请留空字符串 ""
- 不要合并不同股票的信息`;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI 服务请求失败 (${response.status})`);
    }

    const result = await response.json();
    
    // 适配豆包 Chat Completions API 的返回路径
    const rawContent = result.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error("模型未返回有效文本内容");
    }

    // 清理可能存在的 Markdown 代码块标记（防御性处理）
    let jsonStr = rawContent.trim();
    if (jsonStr.includes("```")) {
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const data = JSON.parse(jsonStr);
    const extractedData: ExtractedInfo[] = Array.isArray(data) ? data : [data];
    
    // 收集需要查询股票代码的名称（stockCode 为空的情况）
    const namesToQuery: string[] = [];
    extractedData.forEach(item => {
      const code = item.stockCode?.trim().replace(/[^0-9]/g, '');
      if (!code || code.length !== 6) {
        namesToQuery.push(item.stockName);
      }
    });
    
    // 使用本地股票数据库查询股票代码
    let stockInfoMap: Map<string, StockBasicInfo | null> = new Map();
    if (namesToQuery.length > 0) {
      console.log('正在从本地数据库查询股票代码:', namesToQuery);
      stockInfoMap = batchSearchStocks(namesToQuery);
      
      // 将查询结果回填到提取的数据中
      extractedData.forEach(item => {
        const code = item.stockCode?.trim().replace(/[^0-9]/g, '');
        if (!code || code.length !== 6) {
          const stockInfo = stockInfoMap.get(item.stockName);
          if (stockInfo) {
            item.stockCode = stockInfo.symbol;
            console.log(`✓ ${item.stockName} -> ${stockInfo.symbol}`);
          } else {
            console.log(`✗ 未找到 ${item.stockName} 的股票代码`);
          }
        }
      });
    }
    
    return { 
      data: extractedData, 
      sources: [],
      stockInfoMap
    };
  } catch (error: any) {
    console.error("Doubao API 调用失败:", error);
    throw new Error(`解析失败: ${error.message || "请求 AI 引擎时发生未知错误"}`);
  }
}
