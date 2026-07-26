"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_LEVEL = 6;
const GATE_POSITION = 72;
const START_POSITION = 7;

type GameStatus =
  | "start"
  | "playing"
  | "quiz"
  | "correct"
  | "wrong"
  | "complete";

type Question = {
  a: number;
  b: number;
  answer: number;
  options: number[];
};

const levelNames = [
  "云朵起点",
  "糖果弯道",
  "星星跳台",
  "彩虹隧道",
  "气球高地",
  "冠军之门",
];

const levelColors = [
  "#43d6d0",
  "#ffb23f",
  "#a978f4",
  "#ff6f91",
  "#38bdf8",
  "#f7c843",
];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function makeQuestion(level: number): Question {
  const maxFactor = [3, 4, 5, 6, 8, 9][level - 1];
  const minFactor = level <= 2 ? 1 : Math.max(2, level - 2);
  const a =
    minFactor + Math.floor(Math.random() * (maxFactor - minFactor + 1));
  const b = 1 + Math.floor(Math.random() * maxFactor);
  const answer = a * b;
  const choices = new Set<number>([answer]);
  const offsets = shuffle([-10, -9, -8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 9, 10]);

  for (const offset of offsets) {
    const candidate = answer + offset;
    if (candidate > 0) choices.add(candidate);
    if (choices.size === 4) break;
  }

  return { a, b, answer, options: shuffle([...choices]) };
}

function useSound(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  return useCallback(
    (kind: "jump" | "correct" | "wrong" | "finish") => {
      if (!enabled || typeof window === "undefined") return;
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;
      const context = contextRef.current ?? new AudioContextClass();
      contextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const notes = {
        jump: [440, 0.08],
        correct: [660, 0.18],
        wrong: [190, 0.22],
        finish: [880, 0.35],
      } as const;
      oscillator.frequency.value = notes[kind][0];
      oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + notes[kind][1],
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + notes[kind][1] + 0.02);
    },
    [enabled],
  );
}

export default function MultiplicationAdventure() {
  const [status, setStatus] = useState<GameStatus>("start");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [position, setPosition] = useState(START_POSITION);
  const [jumping, setJumping] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const lastTimeRef = useRef<number | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playSound = useSound(soundOn);

  const progress = useMemo(
    () => Math.round(((level - 1) / MAX_LEVEL) * 100),
    [level],
  );

  const beginLevel = useCallback((targetLevel: number) => {
    setLevel(targetLevel);
    setPosition(START_POSITION);
    setQuestion(makeQuestion(targetLevel));
    setSelectedAnswer(null);
    setStatus("playing");
    lastTimeRef.current = null;
  }, []);

  const startGame = () => {
    setScore(0);
    setHearts(3);
    setStreak(0);
    beginLevel(1);
  };

  const jump = useCallback(() => {
    if (status !== "playing" || jumping) return;
    setJumping(true);
    playSound("jump");
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    jumpTimeoutRef.current = setTimeout(() => setJumping(false), 520);
  }, [jumping, playSound, status]);

  const nudge = useCallback(
    (direction: -1 | 1) => {
      if (status !== "playing") return;
      setPosition((current) =>
        Math.max(START_POSITION, Math.min(GATE_POSITION - 0.2, current + direction * 2.8)),
      );
    },
    [status],
  );

  useEffect(() => {
    if (status !== "playing") return;
    let frame = 0;
    const animate = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = Math.min(time - lastTimeRef.current, 40);
      lastTimeRef.current = time;
      setPosition((current) => {
        const next = current + delta * 0.0095;
        if (next >= GATE_POSITION) {
          setStatus("quiz");
          setSelectedAnswer(null);
          return GATE_POSITION;
        }
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        nudge(-1);
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        nudge(1);
      }
      if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        jump();
      }
      if (event.key === "Enter" && status === "start") startGame();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump, nudge, status]);

  useEffect(
    () => () => {
      if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    },
    [],
  );

  const chooseAnswer = (answer: number) => {
    if (status !== "quiz") return;
    setSelectedAnswer(answer);
    if (answer === question.answer) {
      const nextScore = score + level * 100 + streak * 20;
      setScore(nextScore);
      setStreak((current) => current + 1);
      setHearts((current) => Math.min(3, current + 1));
      if (level === MAX_LEVEL) {
        setStatus("complete");
        playSound("finish");
      } else {
        setStatus("correct");
        playSound("correct");
      }
    } else {
      setHearts((current) => (current <= 1 ? 3 : current - 1));
      setStreak(0);
      setStatus("wrong");
      playSound("wrong");
    }
  };

  const fallbackLevel = Math.max(1, level - 1);

  return (
    <main className="game-shell">
      <div className="background-glow" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <div className="brand-egg" aria-hidden="true">
            ×
          </div>
          <div>
            <p>边玩边学</p>
            <h1>乘法蛋仔大闯关</h1>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => setSoundOn((current) => !current)}
          aria-label={soundOn ? "关闭音效" : "开启音效"}
          title={soundOn ? "关闭音效" : "开启音效"}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </header>

      <section className="dashboard" aria-label="游戏信息">
        <div className="stat-card level-stat">
          <span>当前关卡</span>
          <strong>{level} / {MAX_LEVEL}</strong>
        </div>
        <div className="stat-card">
          <span>活力</span>
          <strong className="hearts" aria-label={`${hearts}点活力`}>
            {Array.from({ length: 3 }, (_, index) => (
              <i key={index} className={index < hearts ? "filled" : ""}>♥</i>
            ))}
          </strong>
        </div>
        <div className="stat-card">
          <span>得分</span>
          <strong>{score}</strong>
        </div>
        <div className="stat-card">
          <span>连对</span>
          <strong>🔥 {streak}</strong>
        </div>
      </section>

      <section className="game-card" aria-label="闯关区域">
        <div className="world-badge">
          <span>第 {level} 关</span>
          <strong>{levelNames[level - 1]}</strong>
        </div>

        <div className="course" style={{ "--level-color": levelColors[level - 1] } as React.CSSProperties}>
          <div className="sky-sparkles" aria-hidden="true">
            <i>✦</i><i>•</i><i>✦</i><i>•</i><i>✦</i>
          </div>
          <div className="finish-flag" aria-hidden="true">
            <span>🏁</span>
          </div>
          <div className={`math-gate ${status === "quiz" ? "active" : ""}`} aria-hidden="true">
            <span>×</span>
            <b>口诀门</b>
          </div>
          <div
            className={`runner ${jumping ? "jumping" : ""}`}
            style={{ left: `${position}%` }}
            aria-label="正在奔跑的原创蛋仔"
          >
            <div className="runner-shadow" />
            <div className="egg-body">
              <div className="egg-shine" />
              <div className="egg-face"><i /><i /><b>⌣</b></div>
              <div className="egg-band">×</div>
              <div className="egg-arm left" />
              <div className="egg-arm right" />
              <div className="egg-foot left" />
              <div className="egg-foot right" />
            </div>
          </div>
          <div className="track" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <div className="course-hint">
            {status === "playing" ? "前方发现口诀门！准备答题" : status === "quiz" ? "闯关暂停 · 请答题" : "完成乘法挑战，打开关卡大门"}
          </div>
        </div>

        <div className="controls">
          <button type="button" onPointerDown={() => nudge(-1)} aria-label="向左移动">←</button>
          <button className="jump-button" type="button" onPointerDown={jump}>跳一跳</button>
          <button type="button" onPointerDown={() => nudge(1)} aria-label="向右移动">→</button>
        </div>
        <p className="keyboard-tip">电脑：A / D 移动，空格跳跃　·　手机：使用下方按钮</p>
      </section>

      <section className="level-route" aria-label="关卡路线">
        {levelNames.map((name, index) => {
          const step = index + 1;
          return (
            <div
              key={name}
              className={`route-step ${step < level ? "done" : ""} ${step === level ? "current" : ""}`}
            >
              <div>{step < level ? "✓" : step}</div>
              <span>{name}</span>
            </div>
          );
        })}
        <div className="route-line">
          <i style={{ width: `${progress}%` }} />
        </div>
      </section>

      {status === "start" && (
        <div className="modal-backdrop">
          <section className="start-panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="start-title">
            <div className="start-mascot" aria-hidden="true">×</div>
            <span className="eyebrow">乘法口诀 · 趣味挑战</span>
            <h2 id="start-title">准备好了吗？</h2>
            <p>小蛋仔会自动向前跑。遇到口诀门时，答对继续闯关；答错就返回上一关。</p>
            <div className="rule-row">
              <div><b>6</b><span>趣味关卡</span></div>
              <div><b>1–9</b><span>乘法口诀</span></div>
              <div><b>3</b><span>点活力</span></div>
            </div>
            <button className="primary-button" type="button" onClick={startGame}>开始闯关</button>
          </section>
        </div>
      )}

      {status === "quiz" && (
        <div className="modal-backdrop">
          <section className="quiz-panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
            <span className="eyebrow">第 {level} 关 · 口诀门</span>
            <h2 id="quiz-title">选出正确答案</h2>
            <div className="question" aria-label={`${question.a}乘以${question.b}等于多少`}>
              <span>{question.a}</span><i>×</i><span>{question.b}</span><i>=</i><b>?</b>
            </div>
            <div className="answer-grid">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-correct={option === question.answer ? "true" : "false"}
                  onClick={() => chooseAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="quiz-tip">认真想一想：{question.a} 个 {question.b} 是多少？</p>
          </section>
        </div>
      )}

      {status === "correct" && (
        <div className="modal-backdrop">
          <section className="result-panel modal-panel success" role="dialog" aria-modal="true">
            <div className="result-icon">★</div>
            <span className="eyebrow">回答正确</span>
            <h2>{question.a} × {question.b} = {question.answer}</h2>
            <p>口诀门打开啦！获得 <b>+{level * 100 + (streak - 1) * 20}</b> 分。</p>
            <button className="primary-button" type="button" onClick={() => beginLevel(level + 1)}>
              进入第 {level + 1} 关
            </button>
          </section>
        </div>
      )}

      {status === "wrong" && (
        <div className="modal-backdrop">
          <section className="result-panel modal-panel error" role="dialog" aria-modal="true">
            <div className="result-icon">↩</div>
            <span className="eyebrow">再练一次就会了</span>
            <h2>{question.a} × {question.b} = {question.answer}</h2>
            <p>
              你选择了 {selectedAnswer}。{level === 1 ? "第一关重新开始" : `返回上一关：第 ${fallbackLevel} 关`}。
            </p>
            <button className="primary-button" type="button" onClick={() => beginLevel(fallbackLevel)}>
              {level === 1 ? "重新挑战第一关" : `返回第 ${fallbackLevel} 关`}
            </button>
          </section>
        </div>
      )}

      {status === "complete" && (
        <div className="modal-backdrop celebration">
          <section className="result-panel modal-panel champion" role="dialog" aria-modal="true">
            <div className="trophy" aria-hidden="true">🏆</div>
            <span className="eyebrow">六关全部完成</span>
            <h2>你是乘法小冠军！</h2>
            <p>最终得分 <b>{score}</b>，最高连续答对 <b>{streak}</b> 题。</p>
            <button className="primary-button" type="button" onClick={startGame}>再玩一次</button>
          </section>
        </div>
      )}

      <footer>
        <span>原创学习小游戏</span>
        <span>乘法口诀范围：1～9</span>
      </footer>
    </main>
  );
}
