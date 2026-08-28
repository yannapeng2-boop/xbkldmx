import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, withBasePath } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "希宝快乐学习大冒险 - 儿童数学古诗词闯关游戏",
    short_name: "希宝学习大冒险",
    description: SITE_DESCRIPTION,
    start_url: withBasePath("/"),
    display: "standalone",
    orientation: "any",
    background_color: "#edf8ff",
    theme_color: "#42cdb7",
    lang: "zh-CN",
    categories: ["education", "games", "kids"],
    icons: [
      {
        src: withBasePath("/icon.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
