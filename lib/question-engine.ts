import { POETRY_BANK } from "./poetry-bank";
import type { GameSettings, LearningQuestion, PracticeType, V4Progress } from "./v4-types";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function numericOptions(answer: number, min = 0, max = 100) {
  const values = new Set([answer]);
  const offsets = shuffle([-12, -10, -9, -5, -3, -2, -1, 1, 2, 3, 5, 9, 10, 12]);
  for (const offset of offsets) {
    const candidate = answer + offset;
    if (candidate >= min && candidate <= max) values.add(candidate);
    if (values.size === 4) break;
  }
  for (let candidate = min; values.size < 4 && candidate <= max; candidate += 1) values.add(candidate);
  return shuffle([...values].map(String));
}

function arithmeticDifficulty(settings: GameSettings): 1 | 2 | 3 | 4 {
  if (settings.grade === 1 && settings.term === "上册") return 1;
  if (settings.grade === 1) return 2;
  return Math.random() < 0.45 ? 3 : 4;
}

function makeArithmetic(settings: GameSettings, seed: number): LearningQuestion {
  const difficulty = arithmeticDifficulty(settings);
  const addition = Math.random() < 0.5;
  let a = 0;
  let b = 0;
  if (difficulty <= 2) {
    a = 2 + Math.floor(Math.random() * 17);
    b = 1 + Math.floor(Math.random() * Math.max(1, 20 - a));
  } else {
    a = 10 + Math.floor(Math.random() * 81);
    b = 1 + Math.floor(Math.random() * Math.max(1, 100 - a));
  }
  if (!addition && b > a) [a, b] = [b, a];
  const answer = addition ? a + b : a - b;
  const symbol = addition ? "+" : "−";
  return {
    id: `math-${addition ? "add" : "sub"}-${a}-${b}`,
    kind: addition ? "addition" : "subtraction",
    grade: settings.grade,
    term: settings.term === "上册" ? "上册" : "下册",
    difficulty,
    prompt: `${a}${symbol}${b}等于多少？`,
    display: `${a} ${symbol} ${b} = ?`,
    answer: String(answer),
    options: numericOptions(answer),
    explanation: `${a} ${symbol} ${b} = ${answer}`,
    source: "小学100以内加减法规则生成",
    enabled: true,
  };
}

function makeMultiplication(settings: GameSettings, seed: number): LearningQuestion {
  const max = settings.grade === 2 ? (settings.term === "上册" ? 5 : 9) : 9;
  const a = 1 + Math.floor(Math.random() * max);
  const b = 1 + Math.floor(Math.random() * max);
  const answer = a * b;
  return {
    id: `math-mul-${a}-${b}`,
    kind: "multiplication",
    grade: settings.grade,
    term: settings.term === "上册" ? "上册" : "下册",
    difficulty: max <= 5 ? 1 : 2,
    prompt: `${a}乘${b}等于多少？`,
    display: `${a} × ${b} = ?`,
    answer: String(answer),
    options: numericOptions(answer, 1, 81),
    explanation: `${a} × ${b} = ${answer}`,
    source: "九九乘法表规则生成",
    enabled: true,
  };
}

function availablePoems(settings: GameSettings) {
  return POETRY_BANK.filter((entry) => {
    if (!entry.enabled || entry.grade > settings.grade) return false;
    if (settings.term === "综合复习") return true;
    if (entry.grade < settings.grade) return true;
    return entry.term === settings.term;
  });
}

function makePoetry(settings: GameSettings): LearningQuestion {
  const candidates = availablePoems(settings);
  const entry = candidates[Math.floor(Math.random() * candidates.length)] ?? POETRY_BANK[0];
  const askLower = Math.random() < 0.5;
  const answer = askLower ? entry.lower : entry.upper;
  const distractors = shuffle(
    candidates
      .filter((item) => item.id !== entry.id)
      .flatMap((item) => [askLower ? item.lower : item.upper])
      .filter((line) => line !== answer),
  ).slice(0, 3);
  return {
    id: `${entry.id}-${askLower ? "down" : "up"}`,
    kind: askLower ? "poetry-down" : "poetry-up",
    grade: entry.grade,
    term: entry.term,
    difficulty: Math.min(4, Math.max(1, entry.grade - 1)) as 1 | 2 | 3 | 4,
    prompt: askLower ? "请选择正确的下一句" : "请选择正确的上一句",
    display: askLower ? entry.upper : entry.lower,
    answer,
    options: shuffle([answer, ...distractors]),
    explanation: `《${entry.title}》${entry.dynasty}·${entry.author}：${entry.upper}${entry.lower}`,
    source: `${entry.edition}｜${entry.grade}年级${entry.term}｜${entry.column}`,
    enabled: entry.enabled,
    poem: {
      title: entry.title,
      author: entry.author,
      dynasty: entry.dynasty,
      column: entry.column,
      edition: entry.edition,
      reviewStatus: entry.reviewStatus,
    },
  };
}

function chooseMixedType(settings: GameSettings): Exclude<PracticeType, "mixed"> {
  const roll = Math.random();
  if (settings.grade === 1) return roll < 0.58 ? "arithmetic" : "poetry";
  if (roll < 0.4) return "arithmetic";
  if (roll < 0.7) return "multiplication";
  return "poetry";
}

export function makeQuestion(settings: GameSettings, progress: V4Progress): LearningQuestion {
  const selected = settings.practiceType === "mixed" ? chooseMixedType(settings) : settings.practiceType;
  const safeType = settings.grade === 1 && selected === "multiplication" ? "arithmetic" : selected;
  const seed = Date.now() + Math.floor(Math.random() * 10000);
  let question =
    safeType === "multiplication"
      ? makeMultiplication(settings, seed)
      : safeType === "poetry"
        ? makePoetry(settings)
        : makeArithmetic(settings, seed);

  for (let attempt = 0; attempt < 8 && progress.recentQuestionIds.includes(question.id); attempt += 1) {
    question =
      safeType === "multiplication"
        ? makeMultiplication(settings, seed + attempt + 1)
        : safeType === "poetry"
          ? makePoetry(settings)
          : makeArithmetic(settings, seed + attempt + 1);
  }
  return question;
}

export function auditQuestionBank() {
  const duplicateIds = POETRY_BANK.map((item) => item.id).filter((id, index, all) => all.indexOf(id) !== index);
  const invalidPoems = POETRY_BANK.filter(
    (item) =>
      !item.upper.trim() ||
      !item.lower.trim() ||
      item.upper === item.lower ||
      item.grade < 1 ||
      item.grade > 6,
  );
  return {
    totalPoems: POETRY_BANK.length,
    duplicateIds,
    invalidPoems: invalidPoems.map((item) => item.id),
    pendingHumanReview: POETRY_BANK.filter((item) => item.reviewStatus !== "source-checked").map((item) => item.id),
  };
}
