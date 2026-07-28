const { chromium } = require("playwright");
const path = require("path");

const baseUrl = process.env.GAME_URL || "http://localhost:3100";
const screenshots = path.join(__dirname, "screenshots");
let activeBrowser;

async function startGame(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "希希乘法大冒险" }).waitFor();
  const startButton = page.locator(".v2-start-panel .v2-primary-button");
  await page.waitForFunction(() => {
    const button = document.querySelector(".v2-start-panel .v2-primary-button");
    return button && !button.disabled;
  });
  await startButton.click();
  await page.locator(".v2-start-panel").waitFor({ state: "detached" });
}

async function moveNearObstacle(page) {
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => {
    const runner = document.querySelector(".v2-runner");
    return runner && Number.parseFloat(runner.style.left) >= 60;
  }, { timeout: 6000 });
  await page.keyboard.up("ArrowRight");
}

async function clearManually(page, level) {
  await moveNearObstacle(page);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.down("ArrowRight");
  await page.getByText("闯关成功！马上进入下一关").waitFor({ timeout: 3000 });
  await page.keyboard.up("ArrowRight");
  await page.locator(".v2-runner.success-jump").waitFor();
  if (level < 24) {
    await page.waitForFunction((nextLevel) => {
      const stat = document.querySelector(".v2-stat.primary strong");
      return stat && stat.textContent.trim().startsWith(String(nextLevel));
    }, level + 1, { timeout: 4000 });
  }
}

async function collideAndOpenQuiz(page) {
  await page.keyboard.down("ArrowRight");
  await page.getByText("撞到障碍！乘法挑战准备中…").waitFor({ timeout: 6000 });
  await page.keyboard.up("ArrowRight");
  await page.getByRole("heading", { name: "选出正确答案" }).waitFor({ timeout: 3000 });
}

async function spokenLines(page) {
  return page.evaluate(() => window.__v3Spoken || []);
}

(async () => {
  console.log("STEP: launching browser");
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.addInitScript(() => {
    window.__v3Spoken = [];
    const synth = {
      cancel() {},
      speak(utterance) {
        window.__v3Spoken.push(utterance.text);
      },
      getVoices() { return []; },
      pause() {},
      resume() {},
      pending: false,
      speaking: false,
      paused: false,
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await startGame(page);
  console.log("STEP: V3 game started");
  await page.getByRole("button", { name: "从第一关重新开始" }).click();
  await page.waitForFunction(() => {
    const stat = document.querySelector(".v2-stat.primary strong");
    return stat && stat.textContent.trim().startsWith("1");
  });
  console.log("STEP: persistent restart button verified");

  await page.keyboard.down("ArrowDown");
  await page.locator(".v2-runner.is-crouching").waitFor();
  await page.keyboard.up("ArrowDown");
  await page.locator(".v2-runner.is-crouching").waitFor({ state: "detached" });
  console.log("STEP: down-key crouch verified");

  await clearManually(page, 1);
  let speech = await spokenLines(page);
  if (!speech.some((line) => /闯关成功|顺利过关|成功越过障碍/.test(line))) {
    throw new Error(`Manual-clear celebration voice was not triggered: ${JSON.stringify(speech)}`);
  }
  if (await page.locator(".v2-result.success").count()) {
    throw new Error("Legacy success modal appeared after manual clear");
  }
  console.log("STEP: manual jump clear, celebration voice and automatic level advance verified");

  await collideAndOpenQuiz(page);
  await page.locator('[data-correct="false"]').first().click();
  await page.getByText("回答错误，马上换一道随机题再试").waitFor();
  await page.locator(".v2-answer-grid button").first().waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const button = document.querySelector(".v2-answer-grid button");
    return button && !button.disabled;
  });
  speech = await spokenLines(page);
  if (!speech.some((line) => line.includes("回答错误"))) {
    throw new Error(`Wrong-answer voice was not triggered: ${JSON.stringify(speech)}`);
  }

  await page.locator('[data-correct="true"]').click();
  await page.getByText("回答正确！马上进入下一关").waitFor();
  await page.waitForFunction(() => {
    const stat = document.querySelector(".v2-stat.primary strong");
    return stat && stat.textContent.trim().startsWith("3");
  }, { timeout: 4000 });
  speech = await spokenLines(page);
  if (!speech.some((line) => line === "回答正确")) {
    throw new Error(`Correct-answer voice was not triggered: ${JSON.stringify(speech)}`);
  }
  if (await page.getByRole("button", { name: "进入第 3 关" }).count()) {
    throw new Error("Legacy next-level page appeared after a correct rescue answer");
  }
  await page.screenshot({
    path: path.join(screenshots, "v3-03-after-quiz-auto-advance.png"),
    fullPage: true,
  });
  console.log("STEP: collision, random quiz, retry, correct voice and automatic advance verified");

  const obstacleSignatures = new Set();
  for (let level = 3; level <= 24; level += 1) {
    obstacleSignatures.add(await page.locator(".v2-obstacle").evaluate((element) => element.className));
    await clearManually(page, level);
    console.log(`STEP: V3 level ${level} manually cleared`);
  }
  if (obstacleSignatures.size !== 22) {
    throw new Error(`Expected 22 remaining unique obstacle signatures, got ${obstacleSignatures.size}`);
  }
  await page.getByRole("heading", { name: "你是乘法闯关王！" }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "v3-04-champion-desktop.png"),
    fullPage: true,
  });

  const iphoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
  });
  const mobile = await iphoneContext.newPage();
  mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await mobile.getByRole("heading", { name: "希希乘法大冒险" }).waitFor();
  await mobile.screenshot({
    path: path.join(screenshots, "h5-iphone-safari.png"),
    fullPage: true,
  });
  const mobileDirectionButtons = await mobile.locator(".v3-controls button").count();
  if (mobileDirectionButtons !== 4) {
    throw new Error(`Expected four mobile direction buttons, got ${mobileDirectionButtons}`);
  }
  const hasHorizontalOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (hasHorizontalOverflow) throw new Error("iPhone layout has horizontal overflow");
  const startButtonBox = await mobile.locator(".v2-start-panel .v2-primary-button").boundingBox();
  if (!startButtonBox || startButtonBox.height < 44) {
    throw new Error(`iPhone start button is too small: ${JSON.stringify(startButtonBox)}`);
  }
  await iphoneContext.close();

  const androidContext = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36",
  });
  const android = await androidContext.newPage();
  await android.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await android.getByRole("heading", { name: "希希乘法大冒险" }).waitFor();
  const androidOverflow = await android.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (androidOverflow) throw new Error("Android layout has horizontal overflow");
  await androidContext.close();

  const wechatContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.54",
  });
  const wechat = await wechatContext.newPage();
  await wechat.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await wechat.getByRole("heading", { name: "希希乘法大冒险" }).waitFor();
  const metadata = await wechat.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogDescription: document.querySelector('meta[property="og:description"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    viewport: document.querySelector('meta[name="viewport"]')?.content,
    manifest: document.querySelector('link[rel="manifest"]')?.href,
  }));
  if (metadata.title !== "希希乘法大冒险 - 儿童乘法闯关游戏") {
    throw new Error(`Unexpected title: ${metadata.title}`);
  }
  if (metadata.description !== "有趣的乘法闯关小游戏，帮助孩子快乐学习九九乘法表。") {
    throw new Error(`Unexpected description: ${metadata.description}`);
  }
  if (!metadata.ogTitle || !metadata.ogDescription || !metadata.ogImage?.includes("opengraph-image")) {
    throw new Error(`WeChat sharing metadata is incomplete: ${JSON.stringify(metadata)}`);
  }
  if (!metadata.viewport?.includes("viewport-fit=cover") || !metadata.manifest) {
    throw new Error(`Mobile H5 metadata is incomplete: ${JSON.stringify(metadata)}`);
  }
  await wechatContext.close();
  if (errors.length) throw new Error(errors.join("\n"));

  console.log("PASS: persistent restart and child-sized buttons");
  console.log("PASS: four-direction controls and crouch");
  console.log("PASS: manual clear celebrates by voice and skips the legacy success page");
  console.log("PASS: collision opens a random multiplication quiz");
  console.log("PASS: wrong retry and correct-answer voice automatically advance");
  console.log("PASS: all 24 levels, iPhone Safari, Android Chrome and WeChat layouts");
  console.log("PASS: SEO, favicon, manifest and WeChat sharing metadata");
  await browser.close();
  activeBrowser = null;
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  if (activeBrowser) await activeBrowser.close().catch(() => {});
});
