export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Term = "上册" | "下册" | "综合复习";
export type PracticeType = "multiplication" | "arithmetic" | "poetry" | "mixed";
export type GameMode = "easy" | "challenge";
export type QuestionKind = "multiplication" | "addition" | "subtraction" | "poetry-up" | "poetry-down";

export type GameSettings = {
  grade: Grade;
  term: Term;
  practiceType: PracticeType;
  mode: GameMode;
  soundOn: boolean;
  voiceOn: boolean;
};

export type LearningQuestion = {
  id: string;
  kind: QuestionKind;
  grade: Grade;
  term: Exclude<Term, "综合复习">;
  difficulty: 1 | 2 | 3 | 4;
  prompt: string;
  display: string;
  answer: string;
  options: string[];
  explanation: string;
  source: string;
  enabled: boolean;
  poem?: {
    title: string;
    author: string;
    dynasty: string;
    column: "课文" | "古诗词诵读" | "日积月累";
    edition: string;
    reviewStatus: "source-checked" | "needs-textbook-review";
  };
};

export type WrongQuestionRecord = {
  id: string;
  kind: QuestionKind;
  wrongCount: number;
  lastWrongAt: string;
};

export type LearningStats = {
  totalAnswered: number;
  totalCorrect: number;
  mathAnswered: number;
  mathCorrect: number;
  poetryAnswered: number;
  poetryCorrect: number;
  manualClears: number;
  rescueAttempts: number;
};

export type V4Progress = {
  version: 4;
  settings: GameSettings;
  highestUnlocked: number;
  bestScore: number;
  stars: number;
  completedLevels: number[];
  wrongQuestions: WrongQuestionRecord[];
  recentQuestionIds: string[];
  stats: LearningStats;
  lastPlayedAt: string | null;
};
