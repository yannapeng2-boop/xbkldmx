"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeQuestion } from "@/lib/question-engine";
import {
  DEFAULT_SETTINGS,
  loadProgress,
  recordAnswer,
  resetProgress,
  saveProgress,
} from "@/lib/v4-storage";
import { V4_LEVELS, type V4Level } from "@/lib/v4-levels";
import type {
  GameMode,
  GameSettings,
  Grade,
  LearningQuestion,
  PracticeType,
  Term,
  V4Progress,
} from "@/lib/v4-types";

const START_POSITION = 7;
const GATE_POSITION = 68;
const MAX_LEVEL = 24;

type Screen = "home" | "playing" | "quiz" | "correct" | "failed" | "complete" | "records";
type Feedback = "correct" | "wrong" | null;

const practiceLabels: Record<PracticeType, { icon: string; title: string; subtitle: string }> = {
  multiplication: { icon: "✕", title: "乘法口诀", subtitle: "快乐练习九九乘法" },
  arithmetic: { icon: "＋", title: "100以内加减法", subtitle: "分级练习进位和退位" },
  poetry: { icon: "诗", title: "古诗词", subtitle: "人教版课内上下句" },
  mixed: { icon: "★", title: "综合挑战", subtitle: "数学和古诗一起练" },
};

function useAudio(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  return useCallback((kind: "jump" | "correct" | "wrong" | "finish") => {
    if (!enabled || typeof window === "undefined") return;
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    if (context.state === "suspended") void context.resume();
    const tones = {
      jump: [440, 610],
      correct: [520, 720, 920],
      wrong: [260, 210],
      finish: [520, 680, 840, 1040],
    }[kind];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.08;
      oscillator.type = kind === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.1, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
  }, [enabled]);
}

function useVoice(enabled: boolean) {
  return useCallback((text: string) => {
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.98;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }, [enabled]);
}

function percentage(correct: number, total: number) {
  return total ? `${Math.round((correct / total) * 100)}%` : "暂无";
}

function Obstacle({ level, screen }: { level: V4Level; screen: Screen }) {
  return (
    <div
      className={`v2-obstacle obstacle-${level.obstacleType} behavior-${level.behavior} ${
        screen === "correct" ? "is-clearing" : screen === "failed" ? "is-blocking" : ""
      }`}
      aria-label={level.obstacleLabel}
    >
      <div className="v2-obstacle-core" aria-hidden="true"><i /><i /><i /><i /><span /></div>
      <b>{level.obstacleLabel}</b>
    </div>
  );
}

function SettingsHome({
  progress,
  settings,
  onChange,
  onStart,
  onContinue,
  onRecords,
  onReset,
}: {
  progress: V4Progress;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onStart: () => void;
  onContinue: () => void;
  onRecords: () => void;
  onReset: () => void;
}) {
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <main className="v4-home">
      <section className="v4-hero">
        <div className="v4-mascot" aria-hidden="true"><span>希</span></div>
        <div>
          <p>24关原创学习冒险 · V4</p>
          <h1>希宝快乐学习大冒险</h1>
          <strong>选好年级和练习内容，马上出发！</strong>
        </div>
      </section>

      <section className="v4-setup-card" aria-label="游戏设置">
        <div className="v4-setting-group">
          <h2><span>1</span>选择年级</h2>
          <div className="v4-chip-grid grades">
            {([1, 2, 3, 4, 5, 6] as Grade[]).map((grade) => (
              <button className={settings.grade === grade ? "selected" : ""} type="button" key={grade} onClick={() => update("grade", grade)}>
                {grade}年级
              </button>
            ))}
          </div>
        </div>

        <div className="v4-setting-group">
          <h2><span>2</span>选择学期</h2>
          <div className="v4-chip-grid terms">
            {(["上册", "下册", "综合复习"] as Term[]).map((term) => (
              <button className={settings.term === term ? "selected" : ""} type="button" key={term} onClick={() => update("term", term)}>
                {term}
              </button>
            ))}
          </div>
        </div>

        <div className="v4-setting-group">
          <h2><span>3</span>选择练习</h2>
          <div className="v4-practice-grid">
            {(Object.keys(practiceLabels) as PracticeType[]).map((type) => {
              const item = practiceLabels[type];
              const disabled = settings.grade === 1 && type === "multiplication";
              return (
                <button
                  className={settings.practiceType === type ? "selected" : ""}
                  disabled={disabled}
                  type="button"
                  key={type}
                  onClick={() => update("practiceType", type)}
                >
                  <i>{item.icon}</i><b>{item.title}</b><small>{disabled ? "一年级暂不开放" : item.subtitle}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="v4-setting-group">
          <h2><span>4</span>选择模式</h2>
          <div className="v4-mode-grid">
            {([
              ["easy", "轻松模式", "复活题答对，直接进入下一关"],
              ["challenge", "挑战模式", "复活题答对，从检查点继续"],
            ] as [GameMode, string, string][]).map(([mode, title, subtitle]) => (
              <button className={settings.mode === mode ? "selected" : ""} type="button" key={mode} onClick={() => update("mode", mode)}>
                <b>{mode === "easy" ? "🌈" : "🏅"} {title}</b><small>{subtitle}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="v4-home-actions">
          <button className="v4-main-button" type="button" onClick={onStart}>开始新冒险</button>
          {progress.highestUnlocked > 1 && <button className="v4-secondary-button" type="button" onClick={onContinue}>继续第 {progress.highestUnlocked} 关</button>}
          <button className="v4-text-button" type="button" onClick={onRecords}>📊 学习记录</button>
          <button className="v4-text-button danger" type="button" onClick={onReset}>↻ 重新开始</button>
        </div>
      </section>
      <p className="v4-privacy">进度只保存在这台设备，不登录、不收集姓名和手机号。</p>
    </main>
  );
}

export default function LearningAdventureV4() {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<V4Progress>(() => ({ ...resetProgress(DEFAULT_SETTINGS) }));
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState<Screen>("home");
  const [levelId, setLevelId] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [position, setPosition] = useState(START_POSITION);
  const [jumping, setJumping] = useState(false);
  const [crouching, setCrouching] = useState(false);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [question, setQuestion] = useState<LearningQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const movementRef = useRef({ left: false, right: false });
  const jumpingRef = useRef(false);
  const crouchingRef = useRef(false);
  const collisionRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const level = V4_LEVELS[levelId - 1];
  const playAudio = useAudio(settings.soundOn);
  const speak = useVoice(settings.voiceOn);

  useEffect(() => {
    const saved = loadProgress();
    setProgress(saved);
    setSettings(saved.settings);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const next = { ...progress, settings };
    saveProgress(next);
  }, [hydrated, progress, settings]);

  useEffect(() => {
    const visibility = () => {
      const hidden = document.visibilityState === "hidden";
      setPaused(hidden);
      if (hidden) movementRef.current = { left: false, right: false };
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  const beginLevel = useCallback((target: number, start = START_POSITION) => {
    const safe = Math.max(1, Math.min(MAX_LEVEL, target));
    setLevelId(safe);
    setPosition(start);
    setSelected(null);
    setFeedback(null);
    setWrongAttempts(0);
    setJumping(false);
    setCrouching(false);
    movementRef.current = { left: false, right: false };
    jumpingRef.current = false;
    crouchingRef.current = false;
    collisionRef.current = false;
    lastTimeRef.current = null;
    setScreen("playing");
  }, []);

  const startRun = (continueRun: boolean) => {
    const safeSettings =
      settings.grade === 1 && settings.practiceType === "multiplication"
        ? { ...settings, practiceType: "arithmetic" as const }
        : settings;
    setSettings(safeSettings);
    setScore(0);
    setStreak(0);
    beginLevel(continueRun ? progress.highestUnlocked : 1);
  };

  const jump = useCallback(() => {
    if (screen !== "playing" || jumpingRef.current || paused) return;
    jumpingRef.current = true;
    crouchingRef.current = false;
    setJumping(true);
    setCrouching(false);
    playAudio("jump");
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    jumpTimeoutRef.current = setTimeout(() => {
      jumpingRef.current = false;
      setJumping(false);
    }, 760);
  }, [paused, playAudio, screen]);

  const setMovement = useCallback((direction: "left" | "right", active: boolean) => {
    movementRef.current[direction] = active;
    if (active) setFacing(direction);
  }, []);

  const pressDown = useCallback((active: boolean) => {
    if (screen !== "playing") return;
    crouchingRef.current = active;
    setCrouching(active);
    if (active && jumpingRef.current) {
      jumpingRef.current = false;
      setJumping(false);
    }
  }, [screen]);

  const finishLevel = useCallback((source: "manual" | "quiz") => {
    movementRef.current = { left: false, right: false };
    collisionRef.current = true;
    const nextLevel = Math.min(MAX_LEVEL, levelId + 1);
    const points = levelId * 50 + (source === "manual" ? 250 : 140) + streak * 15;
    const nextScore = score + points;
    const earnedStars = source === "manual" ? 3 : 2;
    setProgress((current) => ({
      ...current,
      bestScore: Math.max(current.bestScore, nextScore),
      highestUnlocked: Math.max(current.highestUnlocked, nextLevel),
      stars: current.stars + earnedStars,
      completedLevels: [...new Set([...current.completedLevels, levelId])],
      stats: {
        ...current.stats,
        manualClears: current.stats.manualClears + Number(source === "manual"),
      },
      lastPlayedAt: new Date().toISOString(),
    }));
    setScore(nextScore);
    setStreak((current) => current + 1);
    setScreen("correct");
    playAudio(levelId === MAX_LEVEL ? "finish" : "correct");
    speak(levelId === MAX_LEVEL ? "恭喜你，二十四关全部通关！" : source === "manual" ? "闯关成功，下一关出发！" : "回答正确，太棒啦！");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (levelId === MAX_LEVEL) setScreen("complete");
      else beginLevel(nextLevel);
    }, source === "manual" ? 1350 : 950);
  }, [beginLevel, levelId, playAudio, score, speak, streak]);

  const openQuiz = useCallback(() => {
    movementRef.current = { left: false, right: false };
    collisionRef.current = true;
    setStreak(0);
    setScreen("failed");
    playAudio("wrong");
    speak("闯关失败，请完成知识复活题");
    const updated = {
      ...progress,
      stats: { ...progress.stats, rescueAttempts: progress.stats.rescueAttempts + 1 },
    };
    setProgress((current) => ({
      ...current,
      stats: { ...current.stats, rescueAttempts: current.stats.rescueAttempts + 1 },
    }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setQuestion(makeQuestion(settings, updated));
      setSelected(null);
      setFeedback(null);
      setScreen("quiz");
    }, 850);
  }, [playAudio, progress, settings, speak]);

  const passesObstacle = useCallback(() => {
    if (level.behavior === "crouch") return crouchingRef.current;
    return jumpingRef.current;
  }, [level.behavior]);

  useEffect(() => {
    if (screen !== "playing" || paused) return;
    let frame = 0;
    const animate = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = Math.min(40, time - lastTimeRef.current);
      lastTimeRef.current = time;
      setPosition((current) => {
        const direction = Number(movementRef.current.right) - Number(movementRef.current.left);
        if (!direction) return current;
        const next = Math.max(START_POSITION, Math.min(94, current + direction * delta * 0.025));
        if (direction > 0 && current < GATE_POSITION && next >= GATE_POSITION) {
          if (passesObstacle()) {
            finishLevel("manual");
            return GATE_POSITION + 4;
          }
          openQuiz();
          return GATE_POSITION - 1;
        }
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [finishLevel, openQuiz, passesObstacle, paused, screen]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "ArrowLeft" || key === "a") { event.preventDefault(); setMovement("left", true); }
      if (event.key === "ArrowRight" || key === "d") { event.preventDefault(); setMovement("right", true); }
      if (event.key === "ArrowUp" || event.key === " " || key === "w") { event.preventDefault(); jump(); }
      if (event.key === "ArrowDown" || key === "s") { event.preventDefault(); pressDown(true); }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "ArrowLeft" || key === "a") setMovement("left", false);
      if (event.key === "ArrowRight" || key === "d") setMovement("right", false);
      if (event.key === "ArrowDown" || key === "s") pressDown(false);
    };
    const release = () => {
      movementRef.current = { left: false, right: false };
      crouchingRef.current = false;
      setCrouching(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerup", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("blur", release);
    };
  }, [jump, pressDown, setMovement]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
  }, []);

  const chooseAnswer = (answer: string) => {
    if (!question || feedback) return;
    setSelected(answer);
    const correct = answer === question.answer;
    const updated = recordAnswer(progress, question, correct);
    setProgress(updated);
    if (correct) {
      setFeedback("correct");
      playAudio("correct");
      speak("回答正确，太棒啦！");
      if (settings.mode === "easy") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => finishLevel("quiz"), 700);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => beginLevel(levelId, level.checkpoint), 900);
      }
      return;
    }
    setFeedback("wrong");
    playAudio("wrong");
    speak("差一点点，我们看看正确答案");
    const nextWrongAttempts = wrongAttempts + 1;
    setWrongAttempts(nextWrongAttempts);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (nextWrongAttempts >= 2) {
        beginLevel(levelId, settings.mode === "challenge" ? level.checkpoint : START_POSITION);
      } else {
        setQuestion(makeQuestion(settings, updated));
        setSelected(null);
        setFeedback(null);
      }
    }, 1800);
  };

  const resetAll = () => {
    const fresh = resetProgress(settings);
    setProgress(fresh);
    saveProgress(fresh);
    setConfirmReset(false);
    setScreen("home");
    setLevelId(1);
    setScore(0);
    setStreak(0);
  };

  const behaviorHint =
    level.behavior === "crouch"
      ? `按下键蹲过${level.obstacleLabel}`
      : level.behavior === "double-jump"
        ? `靠近${level.obstacleLabel}时跳跃`
        : `跳过${level.obstacleLabel}`;

  const particles = useMemo(() => ({
    cloud: ["☁", "✦", "○", "✧", "☁", "•"],
    candy: ["◆", "●", "✦", "●", "◆", "•"],
    ocean: ["○", "◌", "•", "○", "◌", "•"],
    jungle: ["◆", "♣", "•", "✦", "♣", "◆"],
    space: ["✦", "•", "☄", "✧", "•", "✦"],
    neon: ["◈", "■", "●", "◆", "■", "◈"],
  })[level.world] ?? ["✦"], [level.world]);

  if (!hydrated) return <main className="v4-loading">正在读取冒险进度…</main>;

  if (screen === "home") {
    return (
      <>
        <SettingsHome
          progress={progress}
          settings={settings}
          onChange={setSettings}
          onStart={() => startRun(false)}
          onContinue={() => startRun(true)}
          onRecords={() => setScreen("records")}
          onReset={() => setConfirmReset(true)}
        />
        {confirmReset && (
          <div className="v2-modal-backdrop">
            <section className="v2-modal v4-confirm" role="dialog" aria-modal="true">
              <h2>确定重新开始吗？</h2>
              <p>会清除本机的关卡、星星、学习记录和错题。</p>
              <div><button type="button" onClick={() => setConfirmReset(false)}>取消</button><button className="danger" type="button" onClick={resetAll}>确认清除</button></div>
            </section>
          </div>
        )}
      </>
    );
  }

  if (screen === "records") {
    const stats = progress.stats;
    const rewards = [
      ["☁", "云端贴纸", 4],
      ["🍬", "糖果贴纸", 8],
      ["🐚", "海湾贴纸", 12],
      ["🍄", "丛林贴纸", 16],
      ["🚀", "星际贴纸", 20],
      ["🏆", "冠军贴纸", 24],
    ] as const;
    return (
      <main className="v4-record-page">
        <section className="v4-record-card">
          <span className="v4-record-icon">📊</span>
          <p>本机学习记录</p>
          <h1>希宝的冒险成绩</h1>
          <div className="v4-record-grid">
            <div><span>最高关卡</span><b>{progress.highestUnlocked}/24</b></div>
            <div><span>获得星星</span><b>{progress.stars}★</b></div>
            <div><span>总正确率</span><b>{percentage(stats.totalCorrect, stats.totalAnswered)}</b></div>
            <div><span>数学正确率</span><b>{percentage(stats.mathCorrect, stats.mathAnswered)}</b></div>
            <div><span>古诗正确率</span><b>{percentage(stats.poetryCorrect, stats.poetryAnswered)}</b></div>
            <div><span>错题数量</span><b>{progress.wrongQuestions.length}</b></div>
          </div>
          <p className="v4-review-tip">
            建议复习：{stats.poetryAnswered && stats.poetryCorrect / stats.poetryAnswered < 0.7 ? "古诗词上下句" : stats.mathAnswered && stats.mathCorrect / stats.mathAnswered < 0.7 ? "100以内计算和乘法" : "继续保持，每天闯几关！"}
          </p>
          <div className="v4-rewards" aria-label="冒险奖励">
            {rewards.map(([icon, name, level]) => {
              const unlocked = progress.completedLevels.includes(level);
              const medal = [8, 16, 24].includes(level);
              return <div className={unlocked ? "unlocked" : ""} key={level}><i>{unlocked ? icon : "?"}</i><b>{name}</b><small>{medal ? `第${level}关阶段奖章` : `完成第${level}关解锁`}</small></div>;
            })}
          </div>
          <button className="v4-main-button" type="button" onClick={() => setScreen("home")}>返回首页</button>
        </section>
      </main>
    );
  }

  return (
    <main className={`v2-shell v4-game world-${level.world}`}>
      <header className="v2-topbar">
        <div className="v2-brand"><div className="v2-brand-egg">希</div><div><p>24关手动控制学习冒险 · V4</p><h1>希宝快乐学习大冒险</h1></div></div>
        <div className="v2-header-actions">
          <button className="v2-restart-button" type="button" onClick={() => setScreen("home")}><span>⌂</span><b>首页</b></button>
          <button className="v2-icon-button" type="button" onClick={() => setSettings((value) => ({ ...value, soundOn: !value.soundOn }))}>{settings.soundOn ? "🔊" : "🔇"}</button>
          <button className="v2-icon-button" type="button" onClick={() => setSettings((value) => ({ ...value, voiceOn: !value.voiceOn }))}>{settings.voiceOn ? "🗣" : "🤐"}</button>
        </div>
      </header>

      <section className="v2-dashboard">
        <div className="v2-stat primary"><span>当前关卡</span><strong>{levelId}<small>/24</small></strong></div>
        <div className="v2-stat"><span>练习内容</span><strong>{practiceLabels[settings.practiceType].title}</strong></div>
        <div className="v2-stat"><span>星星</span><strong>★ {progress.stars}</strong></div>
        <div className="v2-stat"><span>得分 · 连对</span><strong>{score} <small>🔥{streak}</small></strong></div>
      </section>

      <section className="v2-game-card">
        <div className="v2-world-badge"><span>{level.boss ? "阶段挑战" : `${settings.mode === "easy" ? "轻松" : "挑战"}模式`}</span><strong>{levelId}. {level.name}</strong></div>
        <div
          className={`v2-course pattern-${level.pattern} weather-${level.weather} ${screen === "correct" ? "is-correct-action" : ""} ${screen === "failed" ? "is-wrong-action" : ""}`}
          style={{
            "--v2-accent": level.accent,
            "--v2-accent-2": level.accent2,
            "--v2-bg": `url("${level.background}")`,
          } as React.CSSProperties}
        >
          <div className="v2-variant-filter" />
          <div className="v2-particles">{particles.map((item, index) => <i key={`${item}-${index}`}>{item}</i>)}</div>
          <div className="v2-action-message" aria-live="polite">
            {screen === "correct" && <span className="success">{levelId % 4 === 0 ? "闯关成功！获得主题贴纸！" : "闯关成功！下一关出发！"}</span>}
            {screen === "failed" && <span className="error">闯关失败，知识复活题准备中…</span>}
          </div>
          {level.id >= 9 && <div className="v4-checkpoint" style={{ left: `${level.checkpoint}%` }}>⚑<small>检查点</small></div>}
          <div className="v2-finish-flag"><span>🏁</span></div>
          <Obstacle level={level} screen={screen} />
          <div
            className={`v2-runner ${jumping ? "manual-jump" : ""} ${crouching ? "is-crouching" : ""} ${facing === "left" ? "facing-left" : ""} ${screen === "correct" ? "success-jump" : ""} ${screen === "failed" ? "collision-hit" : ""}`}
            style={{ left: `${position}%` }}
            aria-label="正在闯关的原创圆蛋角色"
          >
            <div className="v2-runner-shadow" />
            <div className="v2-egg-body">
              <div className="v2-egg-shine" /><div className="v2-egg-face"><i /><i /><b>⌣</b></div>
              <div className="v2-egg-band">希</div><div className="v2-egg-arm left" /><div className="v2-egg-arm right" />
              <div className="v2-egg-foot left" /><div className="v2-egg-foot right" />
              {screen === "failed" && <div className="v2-dizzy">✦　✦</div>}
            </div>
          </div>
          <div className="v2-track">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
          <div className="v2-course-hint">{paused ? "游戏已暂停，返回页面后继续" : behaviorHint}</div>
        </div>

        <div className="v4-touch-controls" aria-label="手机方向控制">
          <div className="v4-dpad">
            <button type="button" aria-label="向左移动" onPointerDown={() => setMovement("left", true)} onPointerUp={() => setMovement("left", false)} onPointerCancel={() => setMovement("left", false)}>←</button>
            <button type="button" aria-label="向下蹲下" onPointerDown={() => pressDown(true)} onPointerUp={() => pressDown(false)} onPointerCancel={() => pressDown(false)}>↓<small>蹲下</small></button>
            <button type="button" aria-label="向右移动" onPointerDown={() => setMovement("right", true)} onPointerUp={() => setMovement("right", false)} onPointerCancel={() => setMovement("right", false)}>→</button>
          </div>
          <button className="v4-jump-button" type="button" aria-label="向上跳跃" onPointerDown={jump}>↑<small>跳跃</small></button>
        </div>
        <p className="v2-keyboard-tip">电脑：← → 或 A D 移动，↑/空格/W 跳跃，↓/S 蹲下</p>
      </section>

      <section className="v2-route">
        <div className="v2-route-title"><strong>24关冒险地图</strong><span>已解锁 {progress.highestUnlocked}/24</span></div>
        <div className="v2-route-grid">
          {V4_LEVELS.map((item) => (
            <button key={item.id} type="button" disabled={item.id > progress.highestUnlocked || ["quiz", "correct", "failed"].includes(screen)} className={`${progress.completedLevels.includes(item.id) ? "done" : ""} ${item.id === levelId ? "current" : ""}`} onClick={() => beginLevel(item.id)}>{progress.completedLevels.includes(item.id) ? "✓" : item.id}</button>
          ))}
        </div>
        <div className="v2-route-line"><i style={{ width: `${((levelId - 1) / 23) * 100}%` }} /></div>
      </section>

      {screen === "quiz" && question && (
        <div className="v2-modal-backdrop">
          <section className="v2-modal v2-quiz-panel v4-quiz" role="dialog" aria-modal="true">
            <span className="v2-eyebrow">知识复活 · 第 {wrongAttempts + 1}/2 次</span>
            <h2>{question.prompt}</h2>
            <div className={`v4-question-display ${question.kind.startsWith("poetry") ? "poetry" : ""}`}>{question.display}</div>
            <div className="v2-answer-grid">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-correct={option === question.answer}
                  disabled={Boolean(feedback)}
                  className={feedback && option === question.answer ? "correct" : feedback === "wrong" && option === selected ? "wrong" : ""}
                  onClick={() => chooseAnswer(option)}
                >{option}</button>
              ))}
            </div>
            <p className={`v2-quiz-tip ${feedback || ""}`} aria-live="polite">
              {!feedback && (settings.mode === "easy" ? "答对后直接进入下一关" : "答对后从本关检查点继续")}
              {feedback === "correct" && "回答正确，太棒啦！"}
              {feedback === "wrong" && <>差一点点！正确答案是：<b>{question.answer}</b><br />{question.explanation}</>}
            </p>
            {question.poem && <small>{question.source}</small>}
          </section>
        </div>
      )}

      {screen === "complete" && (
        <div className="v2-modal-backdrop v2-celebration">
          <section className="v2-modal v2-result champion">
            <div className="v2-trophy">🏆</div><span className="v2-eyebrow">二十四关全部完成</span>
            <h2>希宝是学习闯关王！</h2>
            <p>最终得分 <b>{score}</b>，本次连续答对 <b>{streak}</b> 次。</p>
            <button className="v2-primary-button" type="button" onClick={() => setScreen("records")}>查看学习结果</button>
            <button className="v4-text-button" type="button" onClick={() => { setScore(0); setStreak(0); beginLevel(1); }}>再玩一次</button>
          </section>
        </div>
      )}
    </main>
  );
}
