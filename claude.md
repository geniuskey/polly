# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibePulse (VotePulse) - Korean polling/survey platform where anyone can create and participate in polls. Prosumer model with privacy-first design.

**Tech Stack:**
- Frontend: React + Vite + TypeScript
- Backend: Cloudflare Workers (Hono framework)
- Database: Cloudflare D1 (SQLite)
- Cache: Cloudflare KV
- Auth: Clerk

## Development Commands

```bash
# Frontend
cd frontend && npm run dev          # Dev server (localhost:5173)
cd frontend && npm run build        # Production build
cd frontend && npm run lint         # ESLint

# Workers (Backend)
cd workers && wrangler dev          # Local dev with D1/KV
cd workers && wrangler deploy       # Deploy to Cloudflare

# Database
wrangler d1 execute survey-db --local --command "SELECT * FROM polls LIMIT 10"
wrangler d1 execute survey-db --remote --command "..."   # Production
wrangler d1 execute survey-db --file=migrations/xxx.sql  # Run migration

# Frontend deployment (Cloudflare Pages)
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=vibepulse
```

## Architecture

### Backend (workers/src/)

Hono-based REST API with route-level organization:

| Route | File | Purpose |
|-------|------|---------|
| `/api/polls` | routes/polls.ts | CRUD + voting |
| `/api/polls/:id/comments` | routes/comments.ts | Comments per poll |
| `/api/users` | routes/users.ts | Profile, XP, personality analysis |
| `/api/tags` | routes/tags.ts | Hashtag system |
| `/api/explore` | routes/explore.ts | Ranking, search, insights |
| `/api/admin` | routes/admin.ts | Admin dashboard (email-gated) |

**Middleware:**
- `middleware/auth.ts` - Clerk token verification (`requireAuth`, `optionalAuth`)
- `middleware/cors.ts` - CORS handling

**Utils:**
- `utils/kv.ts` - Vote count caching in KV
- `utils/xp.ts` - XP/level system
- `utils/response.ts` - Standardized API responses

### Frontend (frontend/src/)

| Directory | Purpose |
|-----------|---------|
| components/ | UI components (PollCard, PollFeed, Profile, etc.) |
| hooks/ | React Query hooks (usePolls, useProfile, useAdmin) |
| lib/ | API client, fingerprint, vote storage |
| pages/ | Page-level components (AdminPage, RankingPage, etc.) |

**State Management:** TanStack Query for server state, localStorage for client preferences.

### Database Schema (workers/schema.sql)

Core tables:
- `users` - Clerk integration + XP/level
- `user_profiles` - Demographics with share consent flags
- `polls` - Questions with JSON options array
- `responses` - Votes with fingerprint deduplication
- `tags` / `poll_tags` - Hashtag many-to-many
- `comments` - Per-poll discussions
- `xp_history` - XP transaction log

## Key Patterns

### Vote Deduplication
Uses browser fingerprint stored in responses table with UNIQUE(poll_id, fingerprint) constraint.

### Privacy Model
User demographics (gender, age_group, region) only stored in responses when user explicitly consents via `share_*` flags in user_profiles.

### Real-time Vote Counts
KV cache key: `poll:${pollId}:counts` - Updated on each vote, read on poll detail.

### API Response Format
```typescript
// Success
{ "data": { ... } }

// Error
{ "error": { "code": "DUPLICATE_VOTE", "message": "이미 투표한 설문입니다" } }
```

## Adding New Features

**New API endpoint:**
1. Create/modify route in `workers/src/routes/`
2. Register in `workers/src/index.ts` if new file
3. Add types in `workers/src/types.ts`

**New frontend page:**
1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add API methods in `frontend/src/lib/api.ts`

**Database migration:**
1. Create SQL file in `workers/migrations/`
2. Update `workers/schema.sql` for consistency
3. Execute: `wrangler d1 execute survey-db --remote --file=migrations/xxx.sql`
