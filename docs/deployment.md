# 部署到 Vercel

这份步骤用于把 Couple Flow 部署成一个公开网址。部署后，两台手机可以打开同一个网址使用，不需要一直开着电脑或 localhost。

## 准备

- GitHub 上已有仓库：`Couple-Flow-App`。
- Supabase 项目已经建好，并且已经按 `docs/supabase_setup.md` 配好数据表和 Realtime。
- 不要把真实的 Supabase URL 或 anon key 提交到 GitHub。它们只应该放在本机 `.env.local` 或 Vercel 的 Environment Variables 里。

## Vercel 部署步骤

1. 打开 Vercel。
2. 选择导入 GitHub 仓库 `Couple-Flow-App`。
3. Framework Preset 选择 `Vite`。
4. Build Command 填：

   ```bash
   npm run build
   ```

5. Output Directory 填：

   ```text
   dist
   ```

6. 在 Vercel 的 Environment Variables 里添加：

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

7. 把 Supabase 项目里的 URL 和 anon public key 填进去。
8. 确认不要把真实值写进 `.env.example`、文档或任何会提交到 GitHub 的文件。
9. 点击 Deploy。
10. 部署完成后，打开 Vercel 给出的公开网址。

## 手机上使用

1. 在手机浏览器打开部署后的网址。
2. 确认页面能正常加载。
3. 如果需要像 App 一样使用，可以把网站添加到主屏幕：
   - iPhone Safari：分享按钮 > 添加到主屏幕。
   - Android Chrome：菜单 > 添加到主屏幕。

## 本机开发不变

- 本机开发仍然使用：

  ```bash
  npm run dev
  ```

- 没有配置 Supabase 环境变量时，应用会进入本机模式。
- 配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 后，配对码同步才会启用。
