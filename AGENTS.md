## Cursor Cloud specific instructions

### Overview

FitForge is a Next.js 16 (App Router) fitness/workout planning PWA. It uses Supabase (hosted) for auth + PostgreSQL database, and Google Gemini via Vercel AI SDK for AI workout plan generation. Single application (not a monorepo).

### Dev Server

- `pnpm dev` starts the dev server on port 3000 (Turbopack). See `README.md` for all scripts.
- The app requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Without real Supabase credentials the landing page, login, and sign-up pages render, but auth flows and data operations will fail.
- `AI_GATEWAY_API_KEY` is needed for AI plan generation/update endpoints (the app uses `google/gemini-3-flash` via the Vercel AI SDK provider registry). The README incorrectly references `OPENAI_API_KEY`.

### Gotchas

- **`pnpm lint` does not work.** The `package.json` script runs `next lint`, but Next.js 16 removed the `lint` CLI command. There is no standalone ESLint config in the repo.
- **sharp build approval:** `pnpm.onlyBuiltDependencies` in `package.json` includes `sharp` so its native bindings install correctly. This is required for `pnpm build` (PWA icon generation).
- **Supabase is remote-only.** There is no local Supabase config (`supabase/config.toml`). All data operations require a real Supabase project with the schema from `scripts/001-005_*.sql` applied.
- **Middleware runs on all routes** (`proxy.ts` → `lib/supabase/middleware.ts`) and calls `supabase.auth.getUser()`. With placeholder credentials the call silently fails and unauthenticated users see public pages normally.
