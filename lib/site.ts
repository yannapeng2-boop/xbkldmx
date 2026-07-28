export const SITE_NAME = "希希乘法大冒险 - 儿童乘法闯关游戏";
export const SITE_DESCRIPTION = "有趣的乘法闯关小游戏，帮助孩子快乐学习九九乘法表。";

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "http://localhost:3000";

  const normalizedUrl = configuredUrl.startsWith("http")
    ? configuredUrl
    : `https://${configuredUrl}`;

  return normalizedUrl.replace(/\/+$/, "");
}
