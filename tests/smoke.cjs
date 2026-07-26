const { chromium } = require("playwright");
const path = require("path");

const baseUrl = process.env.GAME_URL || "http://localhost:3100";
const screenshots = path.join(__dirname, "screenshots");
let activeBrowser;

async function reachGate(page) {
  const right = page.getByRole("button", { name: "向右移动" });
  for (let index = 0; index < 24; index += 1) {
    await right.dispatchEvent("pointerdown");
  }
  if (process.env.DEBUG_GATE === "1") {
    console.log("DEBUG runner after nudge:", await page.locator(".v2-runner").getAttribute("style"));
    console.log("DEBUG hint:", await page.locator(".v2-course-hint").textContent());
  }
  await page.getByRole("heading", { name: "选出正确答案" }).waitFor({
    timeout: 12000,
  });
}

async function answerCorrect(page) {
  await page.locator('[data-correct="true"]').click();
}

async function answerWrong(page) {
  await page.locator('[data-correct="false"]').first().click();
}

(async () => {
  console.log("STEP: launching browser");
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  console.log("STEP: browser launched");
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "乘法蛋仔大闯关" }).waitFor();
  console.log("STEP: desktop page loaded");
  await page.screenshot({
    path: path.join(screenshots, "01-start-desktop.png"),
    fullPage: true,
  });
  const startButton = page.locator(".v2-start-panel .v2-primary-button");
  await startButton.waitFor();
  await page.waitForFunction(() => {
    const button = document.querySelector(".v2-start-panel .v2-primary-button");
    return button && !button.disabled;
  });
  await startButton.click();
  await page.locator(".v2-start-panel").waitFor({ state: "detached" });
  console.log("STEP: game started");

  await reachGate(page);
  console.log("STEP: first gate reached");
  await answerWrong(page);
  await page.getByText("答案不对！掉头返回上一关").waitFor();
  await page.locator(".v2-runner.wrong-return").waitFor();
  await page.getByText("第一关重新开始").waitFor();
  await page.getByRole("button", { name: "重新挑战第一关" }).click();
  console.log("STEP: first-level return action verified");

  await reachGate(page);
  await answerCorrect(page);
  await page.getByText("回答正确！起跳——越过障碍！").waitFor();
  await page.locator(".v2-runner.success-jump").waitFor();
  await page.getByRole("button", { name: "进入第 2 关" }).click();
  console.log("STEP: correct jump-over action verified");

  await reachGate(page);
  await answerWrong(page);
  await page.getByText("答案不对！掉头返回上一关").waitFor();
  await page.getByText("已从第 2 关返回第 1 关").waitFor();
  await page.screenshot({
    path: path.join(screenshots, "02-wrong-returns-level.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "重新挑战第一关" }).click();
  console.log("STEP: previous-level return verified");

  const obstacleSignatures = new Set();
  const sceneSignatures = new Set();
  for (let currentLevel = 1; currentLevel <= 24; currentLevel += 1) {
    obstacleSignatures.add(await page.locator(".v2-obstacle").evaluate((element) => element.className));
    sceneSignatures.add(await page.locator(".v2-course").evaluate((element) => {
      const style = getComputedStyle(element);
      return `${element.className}|${style.backgroundImage}|${style.backgroundPosition}`;
    }));
    await reachGate(page);
    await answerCorrect(page);
    await page.getByText("回答正确！起跳——越过障碍！").waitFor();
    if (currentLevel === 12) {
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshots, "03-correct-jump-action.png"),
        fullPage: true,
      });
    }
    if (currentLevel < 24) {
      await page
        .getByRole("button", { name: `进入第 ${currentLevel + 1} 关` })
        .click();
    }
    console.log(`STEP: level ${currentLevel} cleared`);
  }

  if (obstacleSignatures.size !== 24) {
    throw new Error(`Expected 24 unique obstacle signatures, got ${obstacleSignatures.size}`);
  }
  if (sceneSignatures.size !== 24) {
    throw new Error(`Expected 24 unique scene signatures, got ${sceneSignatures.size}`);
  }

  await page.getByRole("heading", { name: "你是乘法闯关王！" }).waitFor();
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(screenshots, "04-champion-desktop.png"),
    fullPage: true,
  });
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("multiplication-egg-adventure-v2-progress") || "{}"),
  );
  if (progress.highestUnlocked !== 24 || progress.bestScore <= 0) {
    throw new Error(`Progress was not saved correctly: ${JSON.stringify(progress)}`);
  }

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await mobile.getByRole("heading", { name: "乘法蛋仔大闯关" }).waitFor();
  await mobile.screenshot({
    path: path.join(screenshots, "05-start-mobile.png"),
    fullPage: true,
  });
  const hasHorizontalOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (hasHorizontalOverflow) throw new Error("Mobile layout has horizontal overflow");

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  console.log("PASS: wrong-answer return animation and correct-answer jump animation");
  console.log("PASS: wrong answer returns from level 2 to level 1");
  console.log("PASS: 24 visually unique obstacles and 24 scene signatures");
  console.log("PASS: 24 correct gates reach champion screen and progress is saved");
  console.log("PASS: desktop and mobile layouts rendered without page errors or overflow");
  await browser.close();
  activeBrowser = null;
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  if (activeBrowser) {
    await activeBrowser.close().catch(() => {});
  }
});
