import { chromium } from 'playwright-core';
import Browserbase from '@browserbasehq/sdk';

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

export async function rankTracker(keyword, targetDomain) {
    console.log(`\n[TRIPWIRE 3] RankTracker initializing cloud browser for keyword: "${keyword}"`);
    let browser;
    try {
        // Initialize Browserbase session and connect Playwright
        const session = await bb.sessions.create({
            browserSettings: { blockAds: true }
        });
        browser = await chromium.connectOverCDP(session.connectUrl);
        const page = browser.contexts()[0].pages()[0];
        page.setDefaultNavigationTimeout(45000);

        // Initial Google visit and consent handling
        await page.goto('https://www.google.com', { waitUntil: 'networkidle' });

        try {
            const btn = await page.$('button#W0wltc, form[action="https://consent.google.com/s"] button');
            if (btn) {
                await btn.click();
                await page.waitForTimeout(1500);
            }
        } catch {}

        let found = null;
        let allResults = [];
        const cleanTarget = targetDomain.replace('www.', '').toLowerCase();

        // Search loop: Iterate through up to 5 pages of Google results
        for (let gPage = 0; gPage < 5; gPage++) {
            console.log(`\n[DEBUG] Navigating to Google Search Page ${gPage + 1}...`);
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${gPage * 10}&num=10&hl=en&gl=in`, { waitUntil: 'networkidle' });

            // Print the page title immediately to detect blocks/consent pages
            const currentTitle = await page.title();
            console.log(`[DEBUG] Google Page Title Loaded: "${currentTitle}"`);

            if (currentTitle.includes("Before you continue") || currentTitle.includes("Consent")) {
                 console.log("🛑 BUSTED: Stuck on Google Consent Screen!");
            } else if (currentTitle.includes("Sorry") || currentTitle.includes("Robot") || currentTitle.includes("Unusual traffic")) {
                 console.log("🛑 BUSTED: Hit a Google CAPTCHA!");
            }

            let pageResults = [];
            // Page extraction retry (up to 3 times if results are missing)
            for (let retry = 0; retry < 3; retry++) {
                try {
                    await page.waitForSelector('h3', { timeout: 8000 });
                    await page.waitForTimeout(1500);

                    pageResults = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('h3')).map(h3 => {
                            let a = h3.closest('a');
                            if (!a) {
                                let p = h3.parentElement;
                                for (let j = 0; j < 5; j++, p = p.parentElement) {
                                    if (p.tagName === 'A') { a = p; break; }
                                }
                            }
                            if (a) {
                                // Added optional chaining to prevent undefined parent element crashes
                                let sub = a.parentElement?.querySelector('a[href]'); 
                                if (sub && sub.contains(h3)) a = sub;
                            }
                            if (!a || !a.href.startsWith('http') || a.href.includes('google.')) return null;

                            let s = '', c = a.parentElement;
                            for (let j = 0; j < 6; j++, c = c.parentElement) {
                                let txt = c.innerText || '';
                                if (txt.length > h3.innerText.length + 50) {
                                    s = txt.split('\n').find(l => l.length > 30 && !l.includes(h3.innerText.substring(0, 20))) || '';
                                    s = s.trim().substring(0, 300);
                                    if (s) break;
                                }
                            }
                            return {
                                url: a.href,
                                domain: new URL(a.href).hostname.replace('www.', ''),
                                title: h3.innerText.trim(),
                                snippet: s
                            };
                        }).filter(Boolean);
                    });

                    console.log(`[SUCCESS] Extracted ${pageResults.length} search items from page evaluation.`);
                    if (pageResults.length > 0) break;
                    
                    console.log(`[WARN] Evaluated 0 items, reloading page... (Retry ${retry + 1}/3)`);
                    await page.reload({ waitUntil: 'networkidle' });
                } catch (e) {
                    console.log(`[ERROR] Selector failed or page timed out on retry ${retry + 1}/3:`, e.message);
                    if (retry === 2) break;
                    await page.reload({ waitUntil: 'networkidle' });
                }
            }
            
            if (!pageResults.length) {
                console.log(`[FATAL] Failed to scrape any data from Google page ${gPage + 1} after all retries.`);
                break;
            }

            // Result synthesis: Update global results and check for target match
            for (const r of pageResults) {
                r.position = allResults.length + 1;
                allResults.push(r);
                if (!found && (r.domain.toLowerCase().includes(cleanTarget) || cleanTarget.includes(r.domain.toLowerCase()))) {
                    found = { ...r, page: gPage + 1 };
                }
            }
            if (found) {
                console.log(`[MATCH FOUND!] Website located at absolute position: ${found.position}`);
                break;
            }

            await page.waitForTimeout(2000 + Math.random() * 2000);
        }

        // Finalization: Close browser and extract competitors
        await browser.close();
        const competitors = allResults.filter(r => !r.domain.toLowerCase().includes(cleanTarget) && !cleanTarget.includes(r.domain.toLowerCase().slice(0, 10)));

        console.log(`[FINISHED] Scan complete. Found status:`, found ? `Ranked #${found.position}` : 'Not found in top 50');

        return {
            success: true,
            data: {
                keyword,
                targetDomain,
                position: found ? found.position : null,
                page: found ? found.page : null,
                title: found ? found.title : '',
                snippet: found ? found.snippet : '',
                competitors,
                totalResultsScanned: allResults.length
            }
        };

    } catch (error) {
        console.error('Rank check error:', error.message);
        if (browser) await browser.close().catch(() => {});
        return { success: false, error: error.message };
    }
}