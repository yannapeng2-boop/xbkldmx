import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { getSiteAssetUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME, withBasePath } from "@/lib/site";
import "./globals.css";
import "./v2.css";
import "./v4.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()).origin,
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: "希宝快乐学习大冒险",
  authors: [{ name: "希宝快乐学习大冒险" }],
  creator: "希宝快乐学习大冒险",
  publisher: "希宝快乐学习大冒险",
  keywords: ["儿童数学", "九九乘法", "100以内加减法", "小学古诗词", "学习游戏", "闯关游戏"],
  alternates: { canonical: getSiteUrl() },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: getSiteUrl(),
    siteName: "希宝快乐学习大冒险",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "希宝快乐学习大冒险分享预览图" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/twitter-image.jpg"],
  },
  icons: {
    icon: [{ url: getSiteAssetUrl("/icon.png"), type: "image/png", sizes: "512x512" }],
    apple: [{ url: getSiteAssetUrl("/apple-icon.png"), type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "希宝学习大冒险",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#42cdb7",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const bodyStyle = {
    "--app-sky-background": `url("${withBasePath("/assets/sky-course.png")}")`,
  } as CSSProperties;

  return <html lang="zh-CN"><body style={bodyStyle}>{children}</body></html>;
}
