# 希宝快乐学习大冒险 V4

适合儿童、家长和老师通过手机浏览器访问的公开 H5 学习闯关游戏。玩家手动控制原创圆蛋角色完成 24 关；失败后通过数学或古诗词“知识复活题”继续冒险。

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript
- Node.js 24
- pnpm 11
- Playwright 浏览器验收
- 无登录、无数据库、无儿童个人信息上传

## V4功能

- 一至六年级、上册/下册/综合复习
- 九九乘法、100以内加减法、课内古诗词和综合挑战
- 轻松模式：复活题答对后直接进入下一关
- 挑战模式：复活题答对后从本关检查点继续
- 24个原创障碍关卡、6个主题场景、3个阶段挑战关
- 键盘和手机触控，支持持续按压
- 正确、错误、成功和最终通关反馈
- 浏览器语音合成不可用时自动保留文字反馈
- 本机保存关卡、星星、学习统计和错题
- V3最高关卡和最高分自动迁移
- iPhone Safari、Android Chrome和微信浏览器布局适配

## 古诗词题库说明

题库文件位于 `lib/poetry-bank.ts`，当前包含一年级至六年级候选课内古诗词数据。每条记录包含年级、册次、栏目、篇名、作者、朝代、上下句、教材版本和复核状态。

古诗原文属于公共领域内容；教材册次、栏目和2024修订版异文仍应由教材持有人在公开发布前完成第二轮人工复核。未完成复核的记录会保留 `needs-textbook-review` 状态，不能把自动化结构校验等同于教材人工核验。

## 本地启动

```powershell
pnpm install
pnpm run dev
```

浏览器打开：

```text
http://localhost:3000
```

## 类型检查和构建

```powershell
pnpm run typecheck
pnpm run build
pnpm run start
```

## 验收测试

```powershell
pnpm run test:v4
pnpm run test:v4:levels
```

浏览器验收默认访问 `http://localhost:3100`。测试前先在3100端口启动生产版本，或通过 `GAME_URL` 指定地址。

逐关测试可以使用：

```powershell
$env:START_LEVEL="1"
$env:END_LEVEL="12"
pnpm run test:v4:levels
```

## 部署到Vercel

1. 将代码推送到自己的GitHub、GitLab或Bitbucket私有仓库。
2. 在Vercel选择 **Add New > Project** 并导入仓库。
3. Framework Preset选择 **Next.js**。
4. Build Command使用 `pnpm run build` 或 `npm run build`。
5. 不手动填写Output Directory。
6. 设置环境变量：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

7. 完成Preview验收后再发布Production。

长期发给学生和家长时，建议在Vercel的 **Settings > Domains** 绑定自定义域名。不要把旧的 `chatgpt.site` 地址作为最终传播地址。

## 部署到 GitHub Pages

仓库已经包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 后，GitHub Actions 会使用 Node.js 24 和 pnpm 11 构建静态版本，并发布 `out` 目录。

当前仓库的公开地址：

```text
https://yannapeng2-boop.github.io/xbkldmx/
```

首次使用时，需要在 GitHub 仓库的 **Settings > Pages > Build and deployment** 中把 Source 选择为 **GitHub Actions**。本机启动不会启用静态导出，原有桌面快捷方式仍使用 `http://localhost:3000`。

## 微信分享

项目已经配置网页标题、描述、Open Graph图片、favicon和Web App Manifest。普通链接可以在微信中打开并读取基础分享信息。

如需强制自定义微信分享卡片行为，还需要公众号、已备案或可配置的业务域名、微信JS-SDK签名服务等外部条件，本项目不会在未具备这些条件时承诺完整微信分享定制。

## 隐私

- 不要求登录
- 不收集姓名、手机号或班级
- 学习记录保存在当前浏览器的 `localStorage`
- 不建立公开儿童排行榜
- 清除浏览器数据会同时清除本机游戏进度
