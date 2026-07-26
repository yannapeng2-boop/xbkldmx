import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v2.css";

export const metadata: Metadata = {
  title: "乘法蛋仔大闯关 V2",
  description: "24关原创乘法口诀派对闯关小游戏",
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
