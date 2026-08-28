const { chromium } = require("playwright");

const baseUrl = process.env.GAME_URL || "http://localhost:3100";
const startLevel = Number(process.env.START_LEVEL || 1);
const endLevel = Number(process.env.END_LEVEL || 12);
let activeBrowser;

async function waitForLevel(page, level) {
  await page.waitForFunction((expected) => {
    const value = document.querySelector(".v2-stat.primary strong")?.textContent?.trim();
    return value?.startsWith(String(expected));
  }, level);
}

async function moveNearObstacle(page) {
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => Number.parseFloat(document.querySelector(".v2-runner")?.style.left || "0") >= 59);
  await page.keyboard.up("ArrowRight");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    localStorage.setItem("xibao-learning-adventure-v4", JSON.stringify({
      version: 4,
      settings: { grade: 3, term: "综合复习", practiceType: "mixed", mode: "easy", soundOn: false, voiceOn: false },
      highestUnlocked: 24,
      bestScore: 0,
      stars: 0,
      completedLevels: [],
      wrongQuestions: [],
      recentQuestionIds: [],
      stats: { totalAnswered: 0, totalCorrect: 0, mathAnswered: 0, mathCorrect: 0, poetryAnswered: 0, poetryCorrect: 0, manualClears: 0, rescueAttempts: 0 },
      lastPlayedAt: null,
    }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "开始新冒险" }).click();
  if (startLevel > 1) {
    await page.locator(".v2-route-grid button").nth(startLevel - 1).click();
  }
  await waitForLevel(page, startLevel);

  const signatures = new Set();
  for (let level = startLevel; level <= endLevel; level += 1) {
    const obstacle = page.locator(".v2-obstacle");
    const className = await obstacle.getAttribute("class");
    signatures.add(className);
    await moveNearObstacle(page);
    if (className.includes("behavior-crouch")) {
      await page.keyboard.down("ArrowDown");
    } else {
      await page.keyboard.press("ArrowUp");
    }
    await page.keyboard.down("ArrowRight");
    await page.getByText(/^闯关成功！/).waitFor();
    await page.keyboard.up("ArrowRight");
    await page.keyboard.up("ArrowDown");
    if (level < 24) await waitForLevel(page, level + 1);
    else await page.getByText("希宝是学习闯关王！").waitFor({ timeout: 5000 });
    console.log(`PASS: level ${level} ${className.includes("behavior-crouch") ? "crouch" : "jump"} clear`);
  }
  if (signatures.size !== endLevel - startLevel + 1) {
    throw new Error(`Obstacle signatures are not unique: ${signatures.size}`);
  }
  await browser.close();
  activeBrowser = null;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  if (activeBrowser) return activeBrowser.close().catch(() => {});
});
