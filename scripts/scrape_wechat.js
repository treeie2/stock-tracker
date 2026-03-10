const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
// You can replace these with the actual WeChat Public Account names you want to monitor
const TARGET_ACCOUNTS = ['Account1', 'Account2'];
const DOUBAO_API_KEY = '075dca3e-090d-4085-bfbd-0d0b8b5cc316';
const STOCK_DB_PATH = path.join(__dirname, '../app/src/stockDatabase.ts');
const OUTPUT_FILE = path.join(__dirname, '../scraped_reports.json');

async function extractStockInfo(text) {
    const API_KEY = DOUBAO_API_KEY;
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

    const userPrompt = `请从以下研报文本中提取所有股票信息，返回 JSON 数组格式：\n\n${text}\n\n注意：\n- 如果有多个股票，每个股票都要作为数组的一个独立元素\n- stockCode 必须是6位数字，如果文本中没有请留空字符串 ""\n- 不要合并不同股票的信息`;

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
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`AI 服务请求失败 (${response.status})`);
        }

        const result = await response.json();
        const rawContent = result.choices?.[0]?.message?.content;

        if (!rawContent) {
            throw new Error("模型未返回有效文本内容");
        }

        let jsonStr = rawContent.trim();
        // Remove markdown code blocks if present
        if (jsonStr.includes("```")) {
            jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
        }

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Extraction Error:", error);
        return [];
    }
}

// Map stock names to codes using local DB if missing
function enrichStockCodes(extractedData) {
    if (!fs.existsSync(STOCK_DB_PATH)) {
        console.warn(`Stock database not found at ${STOCK_DB_PATH}, skipping enrichment.`);
        return extractedData;
    }

    try {
        const dbContent = fs.readFileSync(STOCK_DB_PATH, 'utf-8');
        // Simple regex parse of the TS file to find: { symbol: "000001", name: "平安银行" },
        const stockMap = new Map();
        const regex = /\{ symbol: "(\d{6})", name: "([^"]+)"/g;
        let match;
        while ((match = regex.exec(dbContent)) !== null) {
            stockMap.set(match[2], match[1]); // name -> code
        }

        console.log(`Loaded ${stockMap.size} stocks from database.`);

        return extractedData.map(item => {
            if (!item.stockCode || item.stockCode.length !== 6) {
                const code = stockMap.get(item.stockName);
                if (code) {
                    item.stockCode = code;
                    console.log(`Mapped ${item.stockName} -> ${code}`);
                } else {
                    console.log(`Could not find code for ${item.stockName}`);
                }
            }
            return item;
        });
    } catch (e) {
        console.error("Error enriching stock codes:", e);
        return extractedData;
    }
}

async function scrapeWechat() {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: false, // Visible browser for debugging/captcha
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    // TODO: Implement actual WeChat scraping logic
    // Since we cannot easily automate WeChat login/search due to CAPTCHA,
    // we will use a simple "Copy/Paste" or "Provide URL" approach for now.

    console.log("\n=== WeChat Scraper Mode ===");
    console.log("1. Please navigate to the target WeChat article in the opened browser.");
    console.log("2. OR provide the URL as a command line argument.");

    const url = process.argv[2];
    let content = "";

    if (url) {
        console.log(`Navigating to provided URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for content to load - basic selector for WeChat article body
        try {
            await page.waitForSelector('#js_content', { timeout: 5000 });
        } catch (e) {
            console.log("Could not find #js_content, trying body...");
        }

        content = await page.evaluate(() => {
            const element = document.querySelector('#js_content') || document.body;
            return element.innerText;
        });
    } else {
        // Interactive mode test
        console.log("No URL provided. Running test with dummy data.");
        content = `
         【宁德时代】2025年Q1业绩超预期
         2025-02-09
         逻辑：全球动力电池龙头，储能业务高速增长。
         估值：PE 25倍
         `;
    }

    console.log(`\nExtracted Content Length: ${content.length}`);
    console.log("Processing with AI...");

    const extractedBuffer = await extractStockInfo(content);
    if (extractedBuffer.length === 0) {
        console.log("No stocks found or extraction failed.");
    } else {
        const finalData = enrichStockCodes(extractedBuffer);

        // Save to file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
        console.log(`\nSuccess! Saved ${finalData.length} records to ${OUTPUT_FILE}`);
        console.log(JSON.stringify(finalData, null, 2));
    }

    await browser.close();
}

// Run
scrapeWechat();
