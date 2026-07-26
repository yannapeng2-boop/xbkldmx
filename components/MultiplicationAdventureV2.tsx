"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_LEVEL = 24;
const GATE_POSITION = 68;
const START_POSITION = 7;
const STORAGE_KEY = "multiplication-egg-adventure-v2-progress";

type GameStatus =
  | "start"
  | "playing"
  | "quiz"
  | "correctAction"
  | "wrongAction"
  | "correct"
  | "wrong"
  | "complete";

type Question = {
  a: number;
  b: number;
  answer: number;
  options: number[];
};

type Level = {
  id: number;
  name: string;
  chapter: string;
  chapterIcon: string;
  world: string;
  background: string;
  obstacleType: string;
  obstacleLabel: string;
  accent: string;
  accent2: string;
  pattern: string;
  weather: string;
  maxFactor: number;
};

type LastResult = {
  question: Question;
  selected: number;
  points: number;
  fromLevel: number;
  toLevel: number;
};

const chapters = [
  {
    name: "云端嘉年华",
    icon: "☁",
    world: "cloud",
    background: "/assets/sky-course.png",
    colors: [["#4ddad0", "#6f63ed"], ["#ffcb57", "#55c9f2"], ["#ff7898", "#8d6cf0"], ["#65dca8", "#ffad55"]],
  },
  {
    name: "糖果乐园",
    icon: "◆",
    world: "candy",
    background: "/assets/theme-candy-v2.png",
    colors: [["#ff6f91", "#ffa94d"], ["#a66cf4", "#ff7aa2"], ["#45d2bd", "#ff9b5f"], ["#f0a43a", "#e95d87"]],
  },
  {
    name: "泡泡海湾",
    icon: "◌",
    world: "ocean",
    background: "/assets/theme-ocean-v2.png",
    colors: [["#32c9e8", "#6a7df1"], ["#ff7b8e", "#33c8c2"], ["#5ba9f5", "#a86ce8"], ["#16c7b9", "#ffb44f"]],
  },
  {
    name: "奇趣丛林",
    icon: "♣",
    world: "jungle",
    background: "/assets/theme-jungle-v2.png",
    colors: [["#69c94b", "#f2aa3c"], ["#b066e4", "#50bd69"], ["#2dbd99", "#e2b747"], ["#ef8a3f", "#7c62d9"]],
  },
  {
    name: "星际跳台",
    icon: "✦",
    world: "space",
    background: "/assets/theme-space-v2.png",
    colors: [["#7068f2", "#ff7d65"], ["#2fbde6", "#985fe7"], ["#ffb447", "#536ce7"], ["#e868bb", "#46cce4"]],
  },
  {
    name: "霓虹终极秀",
    icon: "◈",
    world: "neon",
    background: "/assets/theme-neon-v2.png",
    colors: [["#18d7ef", "#f352c6"], ["#b968ff", "#42e5b3"], ["#ffbd36", "#ff4fa6"], ["#38e8ed", "#8964ff"]],
  },
] as const;

const levelBlueprints = [
  ["棉花云伞", "umbrella-fan", "云朵风车"],
  ["旋风跑道", "cloud-windmill", "旋风叶轮"],
  ["星星摆锤", "star-hammer", "星星摆锤"],
  ["彩虹拱桥", "rainbow-arch", "彩虹伸缩门"],
  ["棒棒糖转盘", "lollipop-spinner", "棒棒糖转盘"],
  ["果冻弹墙", "jelly-wall", "果冻弹力墙"],
  ["甜甜圈滚轮", "donut-roller", "甜甜圈滚轮"],
  ["华夫饼大门", "waffle-gate", "华夫饼大门"],
  ["泡泡风扇", "bubble-fan", "泡泡涡轮"],
  ["珊瑚弹墙", "coral-wall", "珊瑚弹力墙"],
  ["海浪滚筒", "wave-roller", "海浪滚筒"],
  ["章鱼拱门", "octopus-arch", "章鱼伸缩门"],
  ["藤蔓秋千", "vine-swing", "藤蔓摆球"],
  ["蘑菇跳台", "mushroom-bouncer", "蘑菇弹跳台"],
  ["竹叶旋杆", "bamboo-spinner", "竹叶旋杆"],
  ["石头图腾", "stone-totem", "石头升降柱"],
  ["彗星光环", "comet-ring", "彗星光环"],
  ["行星摆锤", "planet-hammer", "行星摆锤"],
  ["火箭闸门", "rocket-gate", "火箭升降门"],
  ["陨石滚轮", "meteor-roller", "陨石滚轮"],
  ["像素方墙", "pixel-wall", "像素变化墙"],
  ["激光节拍门", "laser-gate", "节拍光门"],
  ["合成器转盘", "synth-spinner", "音乐转盘"],
  ["冠军全息门", "holo-portal", "冠军全息门"],
] as const;

const patterns = ["dots", "stripes", "checks", "stars"];
const weathers = ["floaters", "ribbons", "glimmers", "bursts"];

const levels: Level[] = levelBlueprints.map(([name, obstacleType, obstacleLabel], index) => {
  const chapterIndex = Math.floor(index / 4);
  const variant = index % 4;
  const chapter = chapters[chapterIndex];
  return {
    id: index + 1,
    name,
    chapter: chapter.name,
    chapterIcon: chapter.icon,
    world: chapter.world,
    background: chapter.background,
    obstacleType,
    obstacleLabel,
    accent: chapter.colors[variant][0],
    accent2: chapter.colors[variant][1],
    pattern: patterns[variant],
    weather: weathers[(variant + chapterIndex) % weathers.length],
    maxFactor: Math.min(9, 3 + Math.floor(index / 3)),
  };
});

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function makeQuestion(levelId: number): Question {
  const definition = levels[levelId - 1];
  const minFactor = levelId < 5 ? 1 : Math.min(6, 2 + Math.floor(levelId / 6));
  const a = minFactor + Math.floor(Math.random() * (definition.maxFactor - minFactor + 1));
  const b = 1 + Math.floor(Math.random() * definition.maxFactor);
  const answer = a * b;
  const choices = new Set<number>([answer]);
  const offsets = shuffle([-12, -10, -9, -8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 9, 10, 12]);
  for (const offset of offsets) {
    if (answer + offset > 0) choices.add(answer + offset);
    if (choices.size === 4) break;
  }
  return { a, b, answer, options: shuffle([...choices]) };
}

function useSound(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  return useCallback((kind: "jump" | "correct" | "wrong" | "finish") => {
    if (!enabled || typeof window === "undefined") return;
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    const sequences = {
      jump: [420, 560],
      correct: [520, 720, 920],
      wrong: [250, 170],
      finish: [520, 680, 840, 1040],
    };
    sequences[kind].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.08;
      oscillator.type = kind === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
    });
  }, [enabled]);
}

function Obstacle({ level, status }: { level: Level; status: GameStatus }) {
  const actionClass =
    status === "correctAction" ? "is-clearing" : status === "wrongAction" ? "is-blocking" : "";
  return (
    <div className={`v2-obstacle obstacle-${level.obstacleType} ${actionClass}`} aria-label={level.obstacleLabel}>
      <div className="v2-obstacle-core" aria-hidden="true">
        <i /><i /><i /><i /><span />
      </div>
      <b>{level.obstacleLabel}</b>
    </div>
  );
}

export default function MultiplicationAdventureV2() {
  const [status, setStatus] = useState<GameStatus>("start");
  const [levelId, setLevelId] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [position, setPosition] = useState(START_POSITION);
  const [manualJump, setManualJump] = useState(false);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(1));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [highestUnlocked, setHighestUnlocked] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const lastTimeRef = useRef<number | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playSound = useSound(soundOn);

  const level = levels[levelId - 1];
  const chapterNumber = Math.ceil(levelId / 4);
  const progress = Math.round(((levelId - 1) / (MAX_LEVEL - 1)) * 100);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Number.isInteger(saved.highestUnlocked)) {
        setHighestUnlocked(Math.max(1, Math.min(MAX_LEVEL, saved.highestUnlocked)));
        setLevelId(Math.max(1, Math.min(MAX_LEVEL, saved.highestUnlocked)));
      }
      if (Number.isInteger(saved.bestScore)) setBestScore(Math.max(0, saved.bestScore));
    } catch {
      // Corrupt local progress should never prevent the game from opening.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ highestUnlocked, bestScore }));
  }, [bestScore, highestUnlocked, hydrated]);

  const beginLevel = useCallback((targetLevel: number) => {
    const safeLevel = Math.max(1, Math.min(MAX_LEVEL, targetLevel));
    setLevelId(safeLevel);
    setPosition(START_POSITION);
    setQuestion(makeQuestion(safeLevel));
    setSelectedAnswer(null);
    setLastResult(null);
    setManualJump(false);
    setStatus("playing");
    lastTimeRef.current = null;
  }, []);

  const startNewRun = () => {
    setScore(0);
    setHearts(3);
    setStreak(0);
    beginLevel(highestUnlocked);
  };

  const jump = useCallback(() => {
    if (status !== "playing" || manualJump) return;
    setManualJump(true);
    playSound("jump");
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    jumpTimeoutRef.current = setTimeout(() => setManualJump(false), 520);
  }, [manualJump, playSound, status]);

  const nudge = useCallback((direction: -1 | 1) => {
    if (status !== "playing") return;
    setPosition((current) =>
      Math.max(START_POSITION, Math.min(GATE_POSITION - 0.2, current + direction * 2.8)),
    );
  }, [status]);

  useEffect(() => {
    if (status !== "playing") return;
    let frame = 0;
    const animate = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = Math.min(time - lastTimeRef.current, 40);
      lastTimeRef.current = time;
      setPosition((current) => {
        const next = current + delta * (0.009 + levelId * 0.00008);
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
  }, [levelId, status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") nudge(-1);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") nudge(1);
      if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump, nudge]);

  useEffect(() => () => {
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
  }, []);

  const chooseAnswer = (answer: number) => {
    if (status !== "quiz") return;
    setSelectedAnswer(answer);
    if (answer === question.answer) {
      const points = levelId * 60 + 100 + streak * 15;
      const nextScore = score + points;
      setScore(nextScore);
      setBestScore((current) => Math.max(current, nextScore));
      setStreak((current) => current + 1);
      setHearts((current) => Math.min(3, current + 1));
      setHighestUnlocked((current) => Math.max(current, Math.min(MAX_LEVEL, levelId + 1)));
      setLastResult({ question, selected: answer, points, fromLevel: levelId, toLevel: Math.min(MAX_LEVEL, levelId + 1) });
      setStatus("correctAction");
      playSound(levelId === MAX_LEVEL ? "finish" : "correct");
      actionTimeoutRef.current = setTimeout(() => {
        setStatus(levelId === MAX_LEVEL ? "complete" : "correct");
      }, 1750);
    } else {
      const fallbackLevel = Math.max(1, levelId - 1);
      setHearts((current) => (current <= 1 ? 3 : current - 1));
      setStreak(0);
      setLastResult({ question, selected: answer, points: 0, fromLevel: levelId, toLevel: fallbackLevel });
      setStatus("wrongAction");
      playSound("wrong");
      actionTimeoutRef.current = setTimeout(() => {
        setLevelId(fallbackLevel);
        setPosition(START_POSITION);
        setQuestion(makeQuestion(fallbackLevel));
        setStatus("wrong");
      }, 1650);
    }
  };

  const courseActionClass =
    status === "correctAction" ? "is-correct-action" : status === "wrongAction" ? "is-wrong-action" : "";

  const particleSymbols = useMemo(() => {
    const symbols: Record<string, string[]> = {
      cloud: ["☁", "✦", "○", "✧", "☁", "•"],
      candy: ["◆", "●", "✦", "●", "◆", "•"],
      ocean: ["○", "◌", "•", "○", "◌", "•"],
      jungle: ["◆", "♣", "•", "✦", "♣", "◆"],
      space: ["✦", "•", "☄", "✧", "•", "✦"],
      neon: ["◈", "■", "●", "◆", "■", "◈"],
    };
    return symbols[level.world];
  }, [level.world]);

  return (
    <main className={`v2-shell world-${level.world}`}>
      <header className="v2-topbar">
        <div className="v2-brand">
          <div className="v2-brand-egg" aria-hidden="true">×</div>
          <div><p>24 关乘法冒险 · V2</p><h1>乘法蛋仔大闯关</h1></div>
        </div>
        <button className="v2-icon-button" type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "关闭音效" : "开启音效"}>
          {soundOn ? "🔊" : "🔇"}
        </button>
      </header>

      <section className="v2-dashboard" aria-label="游戏信息">
        <div className="v2-stat primary"><span>当前关卡</span><strong>{levelId}<small>/24</small></strong></div>
        <div className="v2-stat"><span>主题世界</span><strong>{level.chapterIcon} {level.chapter}</strong></div>
        <div className="v2-stat"><span>活力</span><strong className="v2-hearts">{[0, 1, 2].map((item) => <i className={item < hearts ? "filled" : ""} key={item}>♥</i>)}</strong></div>
        <div className="v2-stat"><span>得分 · 连对</span><strong>{score} <small>🔥{streak}</small></strong></div>
      </section>

      <section className="v2-game-card">
        <div className="v2-world-badge"><span>第 {chapterNumber} 章</span><strong>{levelId}. {level.name}</strong></div>
        <div
          className={`v2-course pattern-${level.pattern} weather-${level.weather} ${courseActionClass}`}
          style={{
            "--v2-accent": level.accent,
            "--v2-accent-2": level.accent2,
            "--v2-bg": `url("${level.background}")`,
            "--v2-variant-x": `${42 + (levelId % 4) * 6}%`,
          } as React.CSSProperties}
        >
          <div className="v2-variant-filter" aria-hidden="true" />
          <div className="v2-particles" aria-hidden="true">
            {particleSymbols.map((symbol, index) => <i key={`${symbol}-${index}`}>{symbol}</i>)}
          </div>
          <div className="v2-action-message" aria-live="polite">
            {status === "correctAction" && <span className="success">回答正确！起跳——越过障碍！</span>}
            {status === "wrongAction" && <span className="error">答案不对！掉头返回上一关</span>}
          </div>
          <div className="v2-finish-flag" aria-hidden="true"><span>🏁</span></div>
          <Obstacle level={level} status={status} />
          <div
            className={`v2-runner ${manualJump ? "manual-jump" : ""} ${status === "correctAction" ? "success-jump" : ""} ${status === "wrongAction" ? "wrong-return" : ""}`}
            style={{ left: `${position}%` }}
            aria-label="正在闯关的原创蛋仔"
          >
            <div className="v2-runner-shadow" />
            <div className="v2-egg-body">
              <div className="v2-egg-shine" />
              <div className="v2-egg-face"><i /><i /><b>⌣</b></div>
              <div className="v2-egg-band">×</div>
              <div className="v2-egg-arm left" /><div className="v2-egg-arm right" />
              <div className="v2-egg-foot left" /><div className="v2-egg-foot right" />
              {status === "wrongAction" && <div className="v2-dizzy">✦　✦</div>}
            </div>
          </div>
          <div className="v2-track" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
          <div className="v2-course-hint">
            {status === "playing" && `前方是${level.obstacleLabel}，准备答题！`}
            {status === "quiz" && "闯关暂停 · 回答乘法口诀"}
            {!["playing", "quiz"].includes(status) && !status.endsWith("Action") && "答对起跳，答错掉头返回"}
          </div>
        </div>

        <div className="v2-controls">
          <button type="button" onPointerDown={() => nudge(-1)} aria-label="向左移动">←</button>
          <button className="jump" type="button" onPointerDown={jump}>跳一跳</button>
          <button type="button" onPointerDown={() => nudge(1)} aria-label="向右移动">→</button>
        </div>
        <p className="v2-keyboard-tip">电脑：A / D 移动，空格跳跃　·　手机：使用下方按钮</p>
      </section>

      <section className="v2-route" aria-label="24关进度">
        <div className="v2-route-title"><strong>冒险地图</strong><span>已解锁 {highestUnlocked} / 24</span></div>
        <div className="v2-route-grid">
          {levels.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.id > highestUnlocked || ["quiz", "correctAction", "wrongAction"].includes(status)}
              className={`${item.id < levelId ? "done" : ""} ${item.id === levelId ? "current" : ""}`}
              onClick={() => beginLevel(item.id)}
              title={`${item.id}. ${item.name}`}
              style={{ "--pip": item.accent } as React.CSSProperties}
            >
              {item.id < levelId ? "✓" : item.id}
            </button>
          ))}
        </div>
        <div className="v2-route-line"><i style={{ width: `${progress}%` }} /></div>
      </section>

      {status === "start" && (
        <div className="v2-modal-backdrop">
          <section className="v2-modal v2-start-panel" role="dialog" aria-modal="true" aria-labelledby="v2-start-title">
            <div className="v2-start-mascot" aria-hidden="true">×</div>
            <span className="v2-eyebrow">六大主题 · 二十四关</span>
            <h2 id="v2-start-title">选择关卡，继续冒险</h2>
            <p>答对后蛋仔会真正跳过不同障碍；答错会掉头跑回上一关。通关记录保存在当前设备。</p>
            <div className="v2-level-picker">
              {levels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.id > highestUnlocked}
                  className={item.id === highestUnlocked ? "recommended" : ""}
                  onClick={() => { setScore(0); setHearts(3); setStreak(0); beginLevel(item.id); }}
                  title={item.id > highestUnlocked ? "尚未解锁" : `${item.chapter} · ${item.name}`}
                >
                  <span>{item.chapterIcon}</span><b>{item.id}</b>
                </button>
              ))}
            </div>
            <button className="v2-primary-button" type="button" disabled={!hydrated} onClick={startNewRun}>
              {!hydrated ? "正在读取进度…" : highestUnlocked === 1 ? "从第一关开始" : `继续第 ${highestUnlocked} 关`}
            </button>
            <small>历史最高分：{bestScore}</small>
          </section>
        </div>
      )}

      {status === "quiz" && (
        <div className="v2-modal-backdrop">
          <section className="v2-modal v2-quiz-panel" role="dialog" aria-modal="true" aria-labelledby="v2-quiz-title">
            <span className="v2-eyebrow">第 {levelId} 关 · {level.obstacleLabel}</span>
            <h2 id="v2-quiz-title">选出正确答案</h2>
            <div className="v2-question" aria-label={`${question.a}乘以${question.b}等于多少`}>
              <span>{question.a}</span><i>×</i><span>{question.b}</span><i>=</i><b>?</b>
            </div>
            <div className="v2-answer-grid">
              {question.options.map((option) => (
                <button key={option} type="button" data-correct={option === question.answer ? "true" : "false"} onClick={() => chooseAnswer(option)}>{option}</button>
              ))}
            </div>
            <p className="v2-quiz-tip">答对：跳过障碍　·　答错：返回上一关</p>
          </section>
        </div>
      )}

      {status === "correct" && lastResult && (
        <div className="v2-modal-backdrop">
          <section className="v2-modal v2-result success" role="dialog" aria-modal="true">
            <div className="v2-result-icon">↗</div>
            <span className="v2-eyebrow">漂亮地跳过去了！</span>
            <h2>{lastResult.question.a} × {lastResult.question.b} = {lastResult.question.answer}</h2>
            <p>越过第 {lastResult.fromLevel} 关，获得 <b>+{lastResult.points}</b> 分。下一关有新的背景和障碍。</p>
            <button className="v2-primary-button" type="button" onClick={() => beginLevel(lastResult.toLevel)}>进入第 {lastResult.toLevel} 关</button>
          </section>
        </div>
      )}

      {status === "wrong" && lastResult && (
        <div className="v2-modal-backdrop">
          <section className="v2-modal v2-result error" role="dialog" aria-modal="true">
            <div className="v2-result-icon">↩</div>
            <span className="v2-eyebrow">已经跑回上一关</span>
            <h2>{lastResult.question.a} × {lastResult.question.b} = {lastResult.question.answer}</h2>
            <p>你选择了 {lastResult.selected}。{lastResult.fromLevel === 1 ? "第一关重新开始。" : `已从第 ${lastResult.fromLevel} 关返回第 ${lastResult.toLevel} 关。`}</p>
            <button className="v2-primary-button" type="button" onClick={() => beginLevel(lastResult.toLevel)}>
              {lastResult.toLevel === 1 ? "重新挑战第一关" : `从第 ${lastResult.toLevel} 关重新出发`}
            </button>
          </section>
        </div>
      )}

      {status === "complete" && lastResult && (
        <div className="v2-modal-backdrop v2-celebration">
          <section className="v2-modal v2-result champion" role="dialog" aria-modal="true">
            <div className="v2-trophy" aria-hidden="true">🏆</div>
            <span className="v2-eyebrow">二十四关全部完成</span>
            <h2>你是乘法闯关王！</h2>
            <p>最终得分 <b>{score}</b>，连续答对 <b>{streak}</b> 题。六大世界全部通关！</p>
            <button className="v2-primary-button" type="button" onClick={() => { setScore(0); setHearts(3); setStreak(0); beginLevel(1); }}>从第一关再玩一次</button>
          </section>
        </div>
      )}
    </main>
  );
}
