import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('C:/tmp', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

await page.goto('http://localhost:3001/sales/new', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/tmp/ss_sales_new2.png' });
console.log('captured');
await browser.close();
