const { chromium } = require("playwright");
const path = require("path");

const baseUrl = process.env.GAME_URL || "http://localhost:3100";
const screenshotDir = path.join(__dirname, "screenshots");
let activeBrowser;

async function waitForLevel(page, level) {
  await page.waitForFunction((expected) => {
    const value = document.querySelector(".v2-stat.primary strong")?.textContent?.trim();
    return value?.startsWith(String(expected));
  }, level);
}

async function failObstacle(page) {
  await page.keyboard.down("ArrowRight");
  await page.getByText("闯关失败，知识复活题准备中…").waitFor({ timeout: 7000 });
  await page.keyboard.up("ArrowRight");
  await page.getByText("知识复活", { exact: false }).waitFor({ timeout: 4000 });
}

async function clearObstacle(page) {
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => Number.parseFloat(document.querySelector(".v2-runner")?.style.left || "0") >= 59);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await page.getByText("闯关成功！下一关出发！").waitFor({ timeout: 4000 });
  await page.keyboard.up("ArrowRight");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  console.log("STEP: V4 home opened");
  await page.getByRole("heading", { name: "希宝快乐学习大冒险" }).waitFor();
  if ((await page.getByRole("button", { name: /年级/ }).count()) !== 6) throw new Error("Grade selector is incomplete");
  if ((await page.locator(".v4-practice-grid button").count()) !== 4) throw new Error("Practice selector is incomplete");
  await page.getByRole("button", { name: "1年级" }).click();
  const multiplicationCard = page.locator(".v4-practice-grid button").filter({ hasText: "乘法口诀" });
  if (!(await multiplicationCard.isDisabled())) throw new Error("Grade 1 multiplication must be disabled");
  await page.getByRole("button", { name: "2年级" }).click();
  await page.locator(".v4-practice-grid button").filter({ hasText: "100以内加减法" }).click();
  await page.getByRole("button", { name: "开始新冒险" }).click();
  await waitForLevel(page, 1);
  console.log("STEP: settings and grade restriction verified");

  const controlCount = await page.locator(".v4-touch-controls button").count();
  if (controlCount !== 4) throw new Error(`Expected 4 touch controls, got ${controlCount}`);
  await page.keyboard.down("ArrowDown");
  await page.locator(".v2-runner.is-crouching").waitFor();
  await page.keyboard.up("ArrowDown");
  await clearObstacle(page);
  await waitForLevel(page, 2);
  console.log("STEP: controls and manual clear verified");

  await failObstacle(page);
  if (!/^[0-9]+ [+−] [0-9]+ = \?$/.test((await page.locator(".v4-question-display").innerText()).trim())) {
    throw new Error("Arithmetic rescue question was not generated");
  }
  await page.locator('[data-correct="false"]').first().click();
  await page.getByText("正确答案是", { exact: false }).waitFor();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll(".v2-answer-grid button")];
    return buttons.length === 4 && buttons.every((button) => !button.disabled);
  }, { timeout: 4000 });
  await page.locator('[data-correct="true"]').click();
  await page.getByText("回答正确，太棒啦！").waitFor();
  await waitForLevel(page, 3);
  console.log("STEP: arithmetic rescue flow verified");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("xibao-learning-adventure-v4") || "{}"));
  if (!stored.stats?.totalAnswered || !stored.wrongQuestions?.length) throw new Error("Learning record was not persisted");

  await page.getByRole("button", { name: "首页" }).click();
  await page.locator(".v4-practice-grid button").filter({ hasText: "古诗词" }).click();
  await page.locator(".v4-mode-grid button").filter({ hasText: "挑战模式" }).click();
  await page.getByRole("button", { name: "开始新冒险" }).click();
  const activePractice = (await page.locator(".v2-stat").filter({ hasText: "练习内容" }).innerText()).trim();
  if (!activePractice.includes("古诗词")) throw new Error(`Poetry setting did not apply: ${activePractice}`);
  await failObstacle(page);
  const poetryPrompt = (await page.locator(".v4-question-display").innerText()).trim();
  if (/^[0-9]+ [×+−] [0-9]+ = \?$/.test(poetryPrompt) || poetryPrompt.length < 4) {
    throw new Error(`Poetry rescue question was not generated: ${poetryPrompt}`);
  }
  await page.locator('[data-correct="true"]').click();
  await page.getByText("回答正确，太棒啦！").waitFor();
  await waitForLevel(page, 1);
  await page.getByText("挑战模式", { exact: false }).waitFor();
  console.log("STEP: poetry challenge flow verified");

  await page.screenshot({ path: path.join(screenshotDir, "v4-game-desktop.png"), fullPage: true });
  if (errors.length) throw new Error(errors.join("\n"));
  await context.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobile.newPage();
  mobilePage.setDefaultTimeout(10000);
  await mobilePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (overflow) throw new Error("Mobile page has horizontal overflow");
  await mobilePage.getByRole("button", { name: "开始新冒险" }).click();
  const boxes = await mobilePage.locator(".v4-touch-controls button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
  if (boxes.some((box) => box.width < 44 || box.height < 44)) throw new Error(`Touch target too small: ${JSON.stringify(boxes)}`);
  await mobilePage.screenshot({ path: path.join(screenshotDir, "v4-home-mobile.png"), fullPage: true });
  await mobile.close();
  console.log("STEP: mobile layout verified");

  console.log("PASS: V4 home settings and grade restrictions");
  console.log("PASS: keyboard and child-sized touch controls");
  console.log("PASS: manual clear and automatic level advance");
  console.log("PASS: arithmetic rescue, wrong feedback, retry and persistence");
  console.log("PASS: poetry rescue and challenge checkpoint flow");
  console.log("PASS: iPhone-sized layout without horizontal overflow");
  await browser.close();
  activeBrowser = null;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  if (activeBrowser) return activeBrowser.close().catch(() => {});
});
