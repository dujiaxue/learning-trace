# 学习轨迹 Learning Trace

AI-Powered PDF reading journal that records your learning process, not just the results.

## What it does

1. **Import PDF** → AI renders the full paper with an annotation overlay
2. **AI Reading Companion** → Select any text to get explanations, Feynman quizzes, and misconception detection (powered by DeepSeek API)
3. **Learning Record** → Every annotation, quiz, and Aha Moment is saved as a layer on top of the complete PDF
4. **One Year Later** → Review your reading path, notes, and mistakes. AI re-quizzes you: "Do you still remember?"

## Why this exists

Most note-taking tools record conclusions. Learning Trace records **the process** — the misconceptions you had, the moments where things clicked, the path you took through a paper. One year later, you can replay how your understanding evolved.

## Tech Stack

- **Next.js 16** + TypeScript + Tailwind CSS
- **Prisma** ORM (SQLite for dev, PostgreSQL for prod)
- **PDF.js** (react-pdf) for in-browser PDF rendering
- **DeepSeek API** (OpenAI-compatible) for AI features
- **NextAuth** for authentication

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your DEEPSEEK_API_KEY

# Run database migration
bunx prisma migrate dev

# Start dev server
bun dev
```

Get your DeepSeek API key at [platform.deepseek.com](https://platform.deepseek.com/)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── timeline/             # Learning timeline (home)
│   ├── reader/[paperId]/     # PDF reader + AI companion
│   ├── blog/                 # Public learning blog
│   └── api/
│       ├── papers/           # CRUD for papers
│       ├── annotations/      # CRUD for annotations
│       └── ai/
│           ├── explain/      # AI paragraph explanation
│           ├── quiz/         # Feynman quiz generation
│           └── evaluate/     # Feynman answer evaluation
├── lib/
│   ├── prisma.ts             # Prisma client
│   ├── ai.ts                 # DeepSeek client + system prompts
│   ├── pdf-storage.ts        # PDF file storage
│   └── auth.ts               # NextAuth config (TODO)
├── components/
│   ├── pdf/                  # PDF.js viewer components (TODO)
│   ├── reader/               # AI panel, annotation layer (TODO)
│   └── timeline/             # Timeline components (TODO)
└── types/
    └── index.ts              # Shared TypeScript types
```

## Database Schema

```
User → Paper → ReadingSession → Annotation
                             → FeynmanQA
                             → AILog
                 → ReadingPath (time-series: page → dwell time → phase)
```

## MVP Roadmap

- [x] Project scaffold + Prisma schema
- [x] Paper upload + storage
- [x] AI explain / quiz / evaluate API routes
- [x] Basic reader UI with text selection → AI interaction
- [x] Timeline page with paper list
- [x] Blog page scaffold
- [ ] PDF.js integration (real PDF rendering)
- [ ] Annotation overlay (highlight + notes on PDF coordinates)
- [ ] Reading session tracking (dwell time, phase detection)
- [ ] Learning record page (complete PDF + baked annotations)
- [ ] Authentication (NextAuth)
- [ ] Public/private toggle for blog posts

## AI Features

| Feature | Trigger | DeepSeek Model | System Prompt |
|---------|---------|----------------|---------------|
| Paragraph explanation | User selects text → "AI Explain" | deepseek-chat | `SYSTEM_PROMPTS.explain` |
| Feynman quiz | User selects text → "Quiz me" | deepseek-chat | `SYSTEM_PROMPTS.quiz` |
| Answer evaluation | User submits Feynman answer | deepseek-chat | `SYSTEM_PROMPTS.evaluate` |
| Structure analysis | Paper import | deepseek-chat | `SYSTEM_PROMPTS.structure` |
| Final summary | Reading session end | deepseek-chat | `SYSTEM_PROMPTS.finalSummary` |

All AI interactions are logged in `AILog` table with full prompt, response, token usage, and latency for quality tracking and future fine-tuning.

## License

MIT
