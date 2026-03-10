# WeChat Article Scraper & Importer

This tool allows you to scrape stock research logic from WeChat Official Account articles and import them into the Stock Tracker App.

## Prerequisites

- Node.js installed
- Google Chrome installed (Script uses system Chrome)
- `npm install` in `app/` directory

## Setup

1. **Install Dependencies**:
   ```bash
   cd app
   npm install
   ```

2. **Configure (Optional)**:
   - Edit `app/scripts/scrape_wechat.js` to change the default Chrome path if needed.
   - The script uses a built-in Doubao API key for parsing.

## Usage

### 1. Scrape an Article
Due to WeChat's anti-scraping protections, you need to provide the article URL manually.

```bash
# In the app directory
node scripts/scrape_wechat.js "https://mp.weixin.qq.com/s/....your_article_url..."
```

**What happens:**
1. A browser window opens to load the article.
2. The script extracts the text content.
3. AI analyzes the text to extract stock info (Code, Name, Logic, Valuation, etc.).
4. Results are saved to `scraped_reports.json` in the project root.

### 2. Import into App
1. Open the Stock Tracker App.
2. Go to the "Import" or "Upload" section (or use the hidden file input if implemented).
3. Select `scraped_reports.json`.
4. The stocks will be added to your dashboard.

## Automation Note
To run this daily, you would typically use Windows Task Scheduler. However, since article URLs change daily and are hard to predict without login, the recommended workflow is:
1. Find the 2 articles you want to read.
2. Run the command for each URL.
   - Note: The script currently overwrites the JSON file. To support multiple, you might want to modify the script to append or run it once per day with multiple URLs (requires code update).

## Troubleshooting
- **Chrome not found**: Update `executablePath` in `scrape_wechat.js`.
- **AI Error**: Check if the API key is valid or quota is exceeded.
