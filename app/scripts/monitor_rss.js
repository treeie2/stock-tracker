import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeArticle } from './scrape_wechat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_FILE = path.join(__dirname, '../../processed_articles.json');
const REPORTS_FILE = path.join(__dirname, '../../scraped_reports.json');
const parser = new Parser();

// Load history of processed URLs
function loadHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        } catch (e) {
            console.error("Error reading history file, starting fresh.", e);
        }
    }
    return [];
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function loadReports() {
    if (fs.existsSync(REPORTS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf-8'));
        } catch (e) {
            console.error("Error reading reports file, return empty array.", e);
        }
    }
    return [];
}

function saveReports(reports) {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

async function monitorRss(rssUrl) {
    if (!rssUrl) {
        console.error("Please provide an RSS URL.");
        console.log("Usage: node scripts/monitor_rss.js <RSS_URL>");
        return;
    }

    console.log(`Checking RSS feed: ${rssUrl}`);
    let feed;
    try {
        feed = await parser.parseURL(rssUrl);
    } catch (e) {
        console.error("Failed to fetch RSS feed:", e.message);
        return;
    }

    const history = loadHistory();
    const newItems = feed.items.filter(item => !history.includes(item.link));

    console.log(`Found ${feed.items.length} items, ${newItems.length} are new.`);

    if (newItems.length === 0) {
        console.log("No new articles to process.");
        return;
    }

    // Process new items (oldest first? usually RSS is newest first. Let's process newest first as they appear)
    for (const item of newItems) {
        console.log(`\nProcessing new article: ${item.title}`);
        console.log(`Link: ${item.link}`);

        try {
            const stockData = await scrapeArticle(item.link);

            if (stockData && stockData.length > 0) {
                const currentReports = loadReports();
                // Append new stocks
                const updatedReports = [...currentReports, ...stockData];
                saveReports(updatedReports);
                console.log(`Saved ${stockData.length} stocks to ${REPORTS_FILE}`);
            }

            // Mark as processed regardless of whether stocks were found (to avoid infinite retries on non-stock articles)
            history.push(item.link);
            saveHistory(history);

        } catch (e) {
            console.error(`Failed to scrape article ${item.link}:`, e);
            // Optionally do NOT mark as processed if it was a transient error? 
            // For now, let's NOT add to history so it retries next time.
        }
    }
}

// Run
const rssUrl = process.argv[2];
monitorRss(rssUrl);
