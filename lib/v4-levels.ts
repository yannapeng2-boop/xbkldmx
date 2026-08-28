export type ObstacleBehavior = "jump" | "crouch" | "timed-jump" | "double-jump";

export type V4Level = {
  id: number;
  name: string;
  chapter: string;
  chapterIcon: string;
  world: string;
  background: string;
  obstacleType: string;
  obstacleLabel: string;
  behavior: ObstacleBehavior;
  accent: string;
  accent2: string;
  pattern: string;
  weather: string;
  boss: boolean;
  checkpoint: number;
};

const chapters = [
  ["云端嘉年华", "☁", "cloud", withBasePath("/assets/sky-course.png"), "#4ddad0", "#6f63ed"],
  ["糖果乐园", "◆", "candy", withBasePath("/assets/theme-candy-v2.png"), "#ff6f91", "#ffa94d"],
  ["泡泡海湾", "◌", "ocean", withBasePath("/assets/theme-ocean-v2.png"), "#32c9e8", "#6a7df1"],
  ["奇趣丛林", "♣", "jungle", withBasePath("/assets/theme-jungle-v2.png"), "#69c94b", "#f2aa3c"],
  ["星际跳台", "✦", "space", withBasePath("/assets/theme-space-v2.png"), "#7068f2", "#ff7d65"],
  ["霓虹终极秀", "◈", "neon", withBasePath("/assets/theme-neon-v2.png"), "#18d7ef", "#f352c6"],
] as const;

const blueprints = [
  ["棉花云伞", "umbrella-fan", "云朵风车", "jump"],
  ["旋风跑道", "cloud-windmill", "旋风叶轮", "timed-jump"],
  ["星星摆锤", "star-hammer", "星星摆锤", "crouch"],
  ["彩虹拱桥", "rainbow-arch", "彩虹伸缩门", "jump"],
  ["棒棒糖转盘", "lollipop-spinner", "棒棒糖转盘", "timed-jump"],
  ["果冻弹墙", "jelly-wall", "果冻弹力墙", "jump"],
  ["甜甜圈滚轮", "donut-roller", "甜甜圈滚轮", "double-jump"],
  ["华夫饼大门", "waffle-gate", "华夫饼挑战门", "crouch"],
  ["泡泡风扇", "bubble-fan", "泡泡涡轮", "jump"],
  ["珊瑚弹墙", "coral-wall", "珊瑚弹力墙", "double-jump"],
  ["海浪滚筒", "wave-roller", "海浪滚筒", "timed-jump"],
  ["章鱼拱门", "octopus-arch", "章鱼伸缩门", "crouch"],
  ["藤蔓秋千", "vine-swing", "藤蔓摆球", "timed-jump"],
  ["蘑菇跳台", "mushroom-bouncer", "蘑菇弹跳台", "double-jump"],
  ["竹叶旋杆", "bamboo-spinner", "竹叶旋杆", "crouch"],
  ["石头图腾", "stone-totem", "石头挑战柱", "jump"],
  ["彗星光环", "comet-ring", "彗星光环", "double-jump"],
  ["行星摆锤", "planet-hammer", "行星摆锤", "crouch"],
  ["火箭闸门", "rocket-gate", "火箭升降门", "timed-jump"],
  ["陨石滚轮", "meteor-roller", "陨石滚轮", "double-jump"],
  ["像素方墙", "pixel-wall", "像素变化墙", "jump"],
  ["激光节拍门", "laser-gate", "节拍光门", "crouch"],
  ["合成器转盘", "synth-spinner", "音乐转盘", "timed-jump"],
  ["冠军全息门", "holo-portal", "冠军终极门", "double-jump"],
] as const;

const patterns = ["dots", "stripes", "checks", "stars"];
const weathers = ["floaters", "ribbons", "glimmers", "bursts"];

export const V4_LEVELS: V4Level[] = blueprints.map(([name, obstacleType, obstacleLabel, behavior], index) => {
  const chapter = chapters[Math.floor(index / 4)];
  return {
    id: index + 1,
    name,
    chapter: chapter[0],
    chapterIcon: chapter[1],
    world: chapter[2],
    background: chapter[3],
    obstacleType,
    obstacleLabel,
    behavior,
    accent: chapter[4],
    accent2: chapter[5],
    pattern: patterns[index % 4],
    weather: weathers[(index + Math.floor(index / 4)) % 4],
    boss: [8, 16, 24].includes(index + 1),
    checkpoint: index + 1 >= 9 ? 36 : 7,
  };
});
import { withBasePath } from "@/lib/site";
