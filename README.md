# scenecraft-AI

基于 Next.js + React + TypeScript 的 SSR 项目，包含登录页与 Three.js 示例主页。

## 功能

- 登录页：手机号 + 默认密码 `123456` 登录
- 主页：Three.js 绘制旋转正方形
- SSR：使用 App Router 服务端组件与服务端鉴权逻辑

## 本地启动

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## Vercel 部署

1. 将仓库推送到 GitHub `main` 分支
2. 在 Vercel 导入该 GitHub 仓库
3. Framework Preset 选择 Next.js
4. 使用默认 Build Command 与 Output Settings 直接部署
