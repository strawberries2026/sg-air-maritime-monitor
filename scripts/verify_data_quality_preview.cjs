const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  fs.mkdirSync('preview-output', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const panel = page.locator('#dataQualityPanel');
    await panel.waitFor({ timeout: 15000 });
    await page.locator('#dataQualityPanel summary').click();
    assert.equal(await panel.evaluate(el => el.open), true, 'Panel must expand');
    await page.waitForFunction(() => {
      const t = document.querySelector('#dataQualityContent')?.textContent || '';
      return t.includes('Aircraft:') && t.includes('Maritime:') && t.includes('History, past 24 hours:');
    }, { timeout: 30000 });
    const result = await page.locator('#dataQualityContent').textContent();
    assert.ok(result.includes('aircraft identifiers') && result.includes('vessel identifiers'));
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'preview-output/data-quality-android.png', fullPage: false });
    fs.writeFileSync('preview-output/verification.txt', 'Android viewport: 393x852\nExpandable panel: PASS\nAircraft, maritime, 24-hour history fields: PASS\nData shown: public-feed observations, not official totals\nBrowser screenshot only; physical Android verification still required.\n');
    console.log('Data quality Android browser preview passed');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
