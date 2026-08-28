const { chromium } = require("playwright");

const baseUrl = process.env.GAME_URL || "http://localhost:3100";
let activeBrowser;

async function inspect(context, label) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "希宝快乐学习大冒险" }).waitFor();
  const metadata = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    viewport: document.querySelector('meta[name="viewport"]')?.content,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  if (metadata.overflow) throw new Error(`${label}: horizontal overflow`);
  if (!metadata.title.includes("希宝快乐学习大冒险") || !metadata.description?.includes("100以内加减法")) {
    throw new Error(`${label}: metadata incomplete`);
  }
  if (!metadata.ogTitle || !metadata.ogImage?.includes("opengraph-image") || !metadata.viewport?.includes("viewport-fit=cover")) {
    throw new Error(`${label}: sharing or viewport metadata incomplete`);
  }
  await page.getByRole("button", { name: "开始新冒险" }).click();
  if ((await page.locator(".v4-touch-controls button").count()) !== 4) throw new Error(`${label}: touch controls missing`);
  if (errors.length) throw new Error(`${label}: ${errors.join("\n")}`);
  await page.close();
  console.log(`PASS: ${label}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  const android = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36",
  });
  await inspect(android, "Android Chrome layout and controls");
  await android.close();

  const wechat = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.54",
  });
  await wechat.addInitScript(() => {
    try { delete window.speechSynthesis; } catch {}
  });
  await inspect(wechat, "WeChat layout, metadata and voice fallback");
  await wechat.close();
  await browser.close();
  activeBrowser = null;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  if (activeBrowser) return activeBrowser.close().catch(() => {});
});
