import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v2.css";

export const metadata: Metadata = {
  title: "乘法蛋仔大闯关 V3",
  description: "24关手动操控乘法闯关游戏：方向键越障，失败答题后直接进入下一关。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#36c6e8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
