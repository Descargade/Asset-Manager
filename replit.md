# AI Productivity SaaS

## Overview

A professional full-stack productivity SaaS application with AI capabilities. Users can manage tasks, get AI-powered recommendations, and visualize their productivity in a modern dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (Replit-managed)
- **AI**: OpenAI via Replit AI Integrations (no API key needed)
- **Charts**: Recharts
- **Routing**: Wouter

## Artifacts

- `artifacts/api-server` — Express REST API (serves at `/api`)
- `artifacts/productivity-app` — React + Vite frontend (serves at `/`)

## Key Features

1. **Authentication** — Clerk-based sign-in/sign-up with branded pages
2. **Task Management** — Create, edit, delete, filter tasks by status/priority/tags
3. **AI Assistant** — "Optimize My Day" (streaming AI analysis of tasks) + persistent AI chat
4. **Dashboard** — KPI cards, productivity charts, priority/status breakdowns, activity feed
5. **Dark/Light Mode** — next-themes based theme switching

## Database Schema

- `tasks` — task records (userId-scoped, with status/priority/tags/dates)
- `activity_logs` — user activity audit trail
- `conversations` — AI chat conversations (userId-scoped)
- `messages` — AI chat messages

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

- `GET/POST /api/tasks` — list and create tasks
- `GET/PUT/DELETE /api/tasks/:id` — task CRUD
- `POST /api/tasks/:id/complete` — mark task complete
- `GET /api/dashboard/summary` — KPI summary
- `GET /api/dashboard/productivity` — daily productivity data (14 days)
- `GET /api/dashboard/priority-breakdown` — tasks by priority
- `GET /api/dashboard/status-breakdown` — tasks by status
- `GET /api/activity` — recent activity log
- `GET/POST /api/openai/conversations` — AI chat conversations
- `GET/DELETE /api/openai/conversations/:id` — conversation management
- `POST /api/openai/conversations/:id/messages` — SSE streaming chat
- `POST /api/openai/optimize-day` — SSE streaming day optimization

## Development Notes

- Task data is userId-scoped (Clerk userId) — users only see their own data
- AI chat uses SSE (Server-Sent Events) for streaming responses
- The OpenAI integration uses Replit's AI proxy (no API key required)
- The orval codegen script patches `lib/api-zod/src/index.ts` after generation to fix duplicate exports

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
