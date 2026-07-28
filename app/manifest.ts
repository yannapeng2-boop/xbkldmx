import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "希希乘法大冒险 - 儿童乘法闯关游戏",
    short_name: "希希乘法大冒险",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#edf8ff",
    theme_color: "#36c6e8",
    lang: "zh-CN",
    categories: ["education", "games", "kids"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
