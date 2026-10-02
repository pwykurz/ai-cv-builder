// Shared Playwright rendering logic used by both scripts/render-pdf.mjs (CLI, writes a file)
// and the dev-server download endpoint in vite.config.ts (returns a buffer over HTTP).
import { chromium } from 'playwright';

export async function renderPdfBuffer(url) {
  let browser;
  try {
    // Chromium refuses to run as root without --no-sandbox (containers, CI).
    const asRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    browser = await chromium.launch({ args: asRoot ? ['--no-sandbox'] : [] });
  } catch (error) {
    console.error('Could not start Chromium. Run once: npx playwright install chromium');
    throw error;
  }

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('main.page');
    // Runs in the browser page context, not Node.
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.emulateMedia({ media: 'print' });

    return await page.pdf({
      preferCSSPageSize: true, // page size and margins come from @page in styles.css
      printBackground: true,
      tagged: true, // adds a structure tree (reading order); harmless for parsers that ignore it
    });
  } finally {
    await browser.close();
  }
}
