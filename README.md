# 希希乘法大冒险

适合儿童、家长和老师通过手机浏览器访问的公开 H5 乘法闯关游戏。

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript
- Node.js 24 LTS
- 纯浏览器游戏逻辑，无数据库、无登录、无 App 安装
- 支持 iPhone Safari、Android Chrome 和微信内置浏览器

## 游戏体验

- 24 个原创关卡与多种障碍
- 方向键或触屏按钮控制移动、跳跃和蹲下
- 手动越障后语音庆祝并自动进入下一关
- 碰撞失败后通过随机乘法题继续闯关
- 包含开始、重新开始、得分、生命值、连对次数和闯关进度
- 本机浏览器保存最高解锁关卡与历史最高分

## 本地启动

项目使用 pnpm 锁定依赖版本：

```powershell
corepack enable
pnpm install
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

## 生产构建

```powershell
npm run build
npm run start
```

`node_modules`、`.next` 和 `.vercel` 已加入 `.gitignore`，不会上传到 Git 或 Vercel。不要手动提交本地依赖目录。

## 部署到 Vercel

### 方式一：连接 Git 仓库

1. 把项目推送到你自己的 GitHub、GitLab 或 Bitbucket 仓库。
2. 登录 Vercel，点击 **Add New > Project**。
3. 导入该仓库。
4. Framework Preset 选择 **Next.js**。
5. Node.js Version 使用 **24.x**（项目也已通过 `package.json` 固定）。
6. Build Command 使用 `npm run build`。
7. 不设置 Output Directory。
8. 添加环境变量：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

9. 点击 Deploy。

### 方式二：Vercel CLI

```powershell
npm install -g vercel
vercel link
vercel deploy
vercel deploy --prod
```

首次部署后，Vercel 会提供一个 `*.vercel.app` 地址。长期发送给学生和家长时，建议在 Vercel 项目的 **Settings > Domains** 绑定自定义域名。

## 正式网址填写位置

在 Vercel 项目的 **Settings > Environment Variables** 中新增：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

Production、Preview、Development 三个环境都可以勾选。修改后重新部署一次，使 canonical、Open Graph、站点地图和微信分享地址更新为正式网址。

本地可复制 `.env.example` 为 `.env.local`：

```powershell
Copy-Item .env.example .env.local
```

## SEO 与分享

- 网页标题：希希乘法大冒险 - 儿童乘法闯关游戏
- 网页描述：有趣的乘法闯关小游戏，帮助孩子快乐学习九九乘法表。
- Open Graph 和大图分享卡片
- favicon、Apple 主屏幕图标、Web App Manifest
- robots.txt、sitemap.xml、canonical 地址

微信分享卡片主要读取网页的 Open Graph 信息。正式域名部署后，如果微信仍显示旧图，通常是微信缓存，可更换一次带参数的链接测试，例如：

```text
https://你的正式域名/?v=1
```

## 手机验收

1. 确认手机和测试电脑能访问部署网址。
2. iPhone Safari：测试开始、左右移动、跳跃、蹲下、音效、重新开始和旋转屏幕。
3. Android Chrome：重复上述流程，确认没有横向滚动。
4. 微信：把链接发到“文件传输助手”，直接在微信内打开并测试触屏按钮。
5. 分别测试一关手动越障和一次碰撞答题。
6. 返回微信聊天，确认分享标题、描述和预览图正常。

## 资源说明

游戏图片全部通过 `/public` 或 Next.js Metadata 文件约定引用，不使用本机绝对路径。分享图和图标位于 `app/`，由 Next.js 自动生成对应资源地址。
