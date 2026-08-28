import type { GameSettings, LearningQuestion, V4Progress } from "./v4-types";

export const V4_STORAGE_KEY = "xibao-learning-adventure-v4";
const V3_STORAGE_KEY = "multiplication-egg-adventure-v2-progress";

export const DEFAULT_SETTINGS: GameSettings = {
  grade: 2,
  term: "综合复习",
  practiceType: "mixed",
  mode: "easy",
  soundOn: true,
  voiceOn: true,
};

export const DEFAULT_PROGRESS: V4Progress = {
  version: 4,
  settings: DEFAULT_SETTINGS,
  highestUnlocked: 1,
  bestScore: 0,
  stars: 0,
  completedLevels: [],
  wrongQuestions: [],
  recentQuestionIds: [],
  stats: {
    totalAnswered: 0,
    totalCorrect: 0,
    mathAnswered: 0,
    mathCorrect: 0,
    poetryAnswered: 0,
    poetryCorrect: 0,
    manualClears: 0,
    rescueAttempts: 0,
  },
  lastPlayedAt: null,
};

export function loadProgress(): V4Progress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const saved = JSON.parse(localStorage.getItem(V4_STORAGE_KEY) || "null") as Partial<V4Progress> | null;
    if (saved?.version === 4) {
      return {
        ...DEFAULT_PROGRESS,
        ...saved,
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
        stats: { ...DEFAULT_PROGRESS.stats, ...saved.stats },
        wrongQuestions: Array.isArray(saved.wrongQuestions) ? saved.wrongQuestions.slice(0, 200) : [],
        recentQuestionIds: Array.isArray(saved.recentQuestionIds) ? saved.recentQuestionIds.slice(-12) : [],
        completedLevels: Array.isArray(saved.completedLevels) ? saved.completedLevels : [],
      };
    }
    const old = JSON.parse(localStorage.getItem(V3_STORAGE_KEY) || "{}");
    return {
      ...DEFAULT_PROGRESS,
      highestUnlocked: Number.isInteger(old.highestUnlocked) ? Math.max(1, Math.min(24, old.highestUnlocked)) : 1,
      bestScore: Number.isInteger(old.bestScore) ? Math.max(0, old.bestScore) : 0,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: V4Progress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(V4_STORAGE_KEY, JSON.stringify(progress));
}

export function recordAnswer(progress: V4Progress, question: LearningQuestion, correct: boolean): V4Progress {
  const poetry = question.kind.startsWith("poetry");
  const existing = progress.wrongQuestions.find((item) => item.id === question.id);
  const wrongQuestions = correct
    ? progress.wrongQuestions
    : existing
      ? progress.wrongQuestions.map((item) =>
          item.id === question.id
            ? { ...item, wrongCount: item.wrongCount + 1, lastWrongAt: new Date().toISOString() }
            : item,
        )
      : [
          ...progress.wrongQuestions,
          { id: question.id, kind: question.kind, wrongCount: 1, lastWrongAt: new Date().toISOString() },
        ].slice(-200);

  return {
    ...progress,
    wrongQuestions,
    recentQuestionIds: [...progress.recentQuestionIds.filter((id) => id !== question.id), question.id].slice(-12),
    stats: {
      ...progress.stats,
      totalAnswered: progress.stats.totalAnswered + 1,
      totalCorrect: progress.stats.totalCorrect + Number(correct),
      mathAnswered: progress.stats.mathAnswered + Number(!poetry),
      mathCorrect: progress.stats.mathCorrect + Number(!poetry && correct),
      poetryAnswered: progress.stats.poetryAnswered + Number(poetry),
      poetryCorrect: progress.stats.poetryCorrect + Number(poetry && correct),
    },
    lastPlayedAt: new Date().toISOString(),
  };
}

export function resetProgress(settings: GameSettings): V4Progress {
  return { ...DEFAULT_PROGRESS, settings };
}
