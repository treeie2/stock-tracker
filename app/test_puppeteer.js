import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log('Attempting to launch browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched successfully');
        const page = await browser.newPage();
        await page.goto('https://example.com');
        console.log('Page title:', await page.title());
        await browser.close();
    } catch (e) {
        console.error('Launch failed:', e);
    }
})();
