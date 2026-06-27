# DEV.md — 学习轨迹 开发指南

> 给未来的自己（或重启 session 的 AI）看的。打开这个文件就能快速回到状态。

## 快速开始

```bash
# 1. 安装依赖（会自动 prisma generate）
npm install

# 2. 复制环境变量模板，填入真实值
cp .env.local.example .env.local
# 编辑 .env.local 填入 DATABASE_URL / DEEPSEEK_API_KEY / AUTH_SECRET / BLOB_READ_WRITE_TOKEN

# 3. 推送数据库 schema
DATABASE_URL="你的数据库URL" npx prisma db push

# 4. 启动开发服务器
npm run dev
```

## 环境变量

| 变量 | 用途 | 获取方式 |
|------|------|----------|
| `DATABASE_URL` | PostgreSQL 连接串 | Neon / Supabase 创建数据库后复制 |
| `DEEPSEEK_API_KEY` | DeepSeek AI API | https://platform.deepseek.com/ |
| `AUTH_SECRET` | NextAuth 加密密钥 | `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 存储令牌 | Vercel → 项目 → Storage → 创建 Blob Store |

## 常用命令

```bash
npm run dev          # 本地开发
npm run build        # 构建（含 prisma generate）
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint
npm run check        # 完整检查：typecheck + lint + build（推线上前跑这个）
npm run check:fast   # 快速检查：typecheck + lint（pre-commit 自动跑）
npm run smoke        # 冒烟测试：npm run smoke -- https://your-app.vercel.app
npm run db:seed      # 填充种子数据
npm run db:migrate   # 部署迁移（生产）
npm run db:migrate:dev  # 开发迁移（本地）
```

## 架构概览

### 技术栈
- **框架**: Next.js 16 (App Router, Turbopack)
- **数据库**: PostgreSQL (Neon) + Prisma ORM 6.x
- **AI**: DeepSeek API（兼容 OpenAI SDK）
- **存储**: Vercel Blob (Private Store)
- **部署**: Vercel
- **PDF 解析**: 前端 react-pdf + pdfjs-dist（浏览器端），后端 unpdf（serverless 端）

### 数据模型（10 个表）

```
User ─┬─ Paper ─┬─ ReadingSession ── FeynmanQA
      │         ├─ Annotation
      │         ├─ AILog
      │         ├─ BlogPost
      │         └─ KnowledgeLink (source ↔ target)
      ├─ ApiKey
      ├─ Account (NextAuth)
      └─ Session (NextAuth)
```

### API 路由清单

| 路由 | 方法 | 用途 |
|------|------|------|
| `/api/papers` | GET | 列出论文 |
| `/api/papers` | POST | 上传论文（触发导入即分析） |
| `/api/papers/[id]` | GET | 论文详情 |
| `/api/papers/[id]/reanalyze` | POST | 重新跑 PDF 提取 + 结构分析 |
| `/api/pdf?id=xxx` | GET | PDF 代理（读取私有 Blob） |
| `/api/annotations` | POST | 创建标注 |
| `/api/ai/explain` | POST | AI 解释选中内容 |
| `/api/ai/quiz` | POST | AI 出题 |
| `/api/ai/evaluate` | POST | AI 评估答题 |
| `/api/ai/misconception` | POST | AI 误解检测 |
| `/api/ai/review` | POST | AI 点评笔记 |
| `/api/ai/final-summary` | POST | AI 生成最终总结 |
| `/api/ai/knowledge-links` | POST | AI 跨论文关联 |
| `/api/ai/generate-blog` | POST | AI 笔记→博客润色 |
| `/api/knowledge-links` | GET | 获取知识关联 |
| `/api/blog-posts` | GET | 获取博客文章 |
| `/api/api-keys` | POST | 创建 API Key |
| `/api/search` | GET | 通用搜索 |

### 前端页面

| 路径 | 用途 |
|------|------|
| `/` | 首页（上传入口） |
| `/timeline` | 学习时间线 |
| `/reader/[paperId]` | PDF 阅读器 + 标注 + AI 面板 |
| `/record/[paperId]` | 学习记录详情 |
| `/blog` | 学习博客 |

### 认证

- Web 前端：session（NextAuth，目前 fallback 到 `demo-user`）
- API 访问：`Authorization: Bearer lt_xxx`（API Key，`lt_` 前缀 + 32 位随机）
- 所有需要认证的路由调 `getUserId(req)`（`src/lib/auth.ts`）

## 部署流程

1. **本地检查**：`npm run check` 通过
2. **推送 main**：`git push origin main`
3. Vercel 自动构建部署（等 2-3 分钟）
4. **冒烟测试**：`npm run smoke -- https://learning-trace-dujiaxues-projects.vercel.app`

**生产域名**：`https://learning-trace-dujiaxues-projects.vercel.app`
（不带 hash 的是固定域名，带 hash 的是部署快照不会更新）

## 项目规则

### 1. 本地验证铁律

**推线上之前必须通过：**
```bash
npm run check   # typecheck + lint + build
```

**禁止"推到线上看报错"的调试方式。**

### 2. 分支策略

- `main` = 线上稳定版
- 功能/修复开分支：`feat/xxx`、`fix/xxx`、`chore/xxx`
- 分支 merge 到 main 前必须 `npm run check` 通过

### 3. Commit 规范

格式：`<type>: <description>`

| type | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修 bug |
| `refactor:` | 重构（不改功能） |
| `chore:` | 配置/依赖/杂项 |
| `docs:` | 文档 |
| `test:` | 测试 |

**禁止 `debug:` 类型。** 调试代码不进 main。

### 4. 清理铁律

- 调试端点（`debug-*`）用完即删
- 废弃依赖及时 `npm uninstall`
- 废弃路由文件直接删
- 每次大功能完成后做一次 cleanup commit

### 5. Pre-commit Hook

每次 `git commit` 自动运行 `typecheck + lint`，失败则提交中止。
如果需要跳过（紧急情况）：`git commit --no-verify`（不推荐）。

## 已知踩坑记录

| 坑 | 解法 |
|----|------|
| pdfjs-dist v6 在 Vercel serverless 不可用 | 用 unpdf 替代（服务端） |
| after() 在 Vercel serverless 不可靠 | 同步执行，不依赖 after() |
| Vercel Blob Private Store 浏览器直接访问 403 | 用 `/api/pdf?id=` 代理 |
| Next.js 16 动态路由 params 是 Promise | `await params` |
| Vercel 带 hash 的 URL 是快照不更新 | 用不带 hash 的生产域名 |
| Prisma 7.x 需要 accelerateUrl | 用 6.x |
| DeepSeek API 余额为 0 时返回 401 | 充值 |
