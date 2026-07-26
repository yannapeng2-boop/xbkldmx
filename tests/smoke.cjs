const { chromium } = require("playwright");
const path = require("path");

const baseUrl = process.env.GAME_URL || "http://127.0.0.1:3100";
const screenshots = path.join(__dirname, "screenshots");

async function reachGate(page) {
  await page.evaluate(() => {
    const right = document.querySelector('[aria-label="向右移动"]');
    if (!right) throw new Error("Right movement button was not found");
    for (let index = 0; index < 24; index += 1) {
      right.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    }
  });
  await page.getByRole("heading", { name: "选出正确答案" }).waitFor({
    timeout: 5000,
  });
}

async function answerCorrect(page) {
  await page.locator('[data-correct="true"]').click();
}

async function answerWrong(page) {
  await page.locator('[data-correct="false"]').first().click();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  console.log("STEP: desktop page loaded");
  await page.screenshot({
    path: path.join(screenshots, "01-start-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "开始闯关" }).click();
  console.log("STEP: game started");

  await reachGate(page);
  console.log("STEP: first gate reached");
  await answerWrong(page);
  await page.getByText("第一关重新开始").waitFor();
  await page.getByRole("button", { name: "重新挑战第一关" }).click();
  console.log("STEP: first-level reset verified");

  await reachGate(page);
  await answerCorrect(page);
  await page.getByText("回答正确").waitFor();
  await page.getByRole("button", { name: "进入第 2 关" }).click();
  console.log("STEP: level 2 entered");

  await reachGate(page);
  await answerWrong(page);
  await page.getByText("返回上一关：第 1 关").waitFor();
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(screenshots, "02-wrong-returns-level.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "返回第 1 关" }).click();
  console.log("STEP: previous-level return verified");

  for (let currentLevel = 1; currentLevel <= 6; currentLevel += 1) {
    await reachGate(page);
    await answerCorrect(page);
    if (currentLevel < 6) {
      await page
        .getByRole("button", { name: `进入第 ${currentLevel + 1} 关` })
        .click();
    }
    console.log(`STEP: level ${currentLevel} cleared`);
  }

  await page.getByRole("heading", { name: "你是乘法小冠军！" }).waitFor();
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(screenshots, "03-champion-desktop.png"),
    fullPage: true,
  });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.screenshot({
    path: path.join(screenshots, "04-start-mobile.png"),
    fullPage: true,
  });

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  console.log("PASS: first-level reset");
  console.log("PASS: wrong answer returns from level 2 to level 1");
  console.log("PASS: six correct gates reach champion screen");
  console.log("PASS: desktop and mobile layouts rendered without page errors");
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
