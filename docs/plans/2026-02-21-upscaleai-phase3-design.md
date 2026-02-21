# UpscaleAI — Phase 3 Design Doc

**Date:** 2026-02-21
**Phase:** 3 — Auth, Job History & Dashboard
**Status:** Approved

---

## Overview

Add Supabase authentication (email magic link + Google OAuth), persist upscale jobs for signed-in users, and build a user dashboard showing job history, usage stats, and plan info. Guest upscales are not saved. Stripe and Pro unlocks move to Phase 4.

---

## Approach

`@supabase/ssr` with Next.js App Router middleware — the modern, officially supported pattern. Sessions are stored in cookies, refreshed server-side on every request. Server components and API routes can read auth state without client-side waterfalls.

---

## Architecture

Three additions to the existing app:

1. **`middleware.ts`** — project root, refreshes Supabase session on every request via cookies
2. **`lib/supabase/server.ts`** + **`lib/supabase/client.ts`** — pre-configured Supabase clients for server and browser contexts
3. **`app/dashboard/page.tsx`** — protected route, redirects to `/` if not signed in (server-side check)

Existing `/api/upscale` saves the job to the DB after Replicate completes, only when a valid session cookie is present.

---

## Auth Flow

- "Sign In" button in Navbar opens a shadcn `Dialog` modal
- Two options: **Continue with Google** (OAuth) and **Continue with Email** (magic link — passwordless)
- After sign-in, user redirected back to the app
- Navbar switches from "Sign In" to user avatar with dropdown: **Dashboard** + **Sign Out**
- Auth callback at `/auth/callback` — exchanges Supabase code for session, redirects to `/`

---

## Database Schema

```sql
create table jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  result_url  text not null,
  resolution  text not null,
  format      text not null,
  created_at  timestamptz default now()
);

alter table jobs enable row level security;
create policy "users own their jobs" on jobs
  for all using (auth.uid() = user_id);
```

Row Level Security enforces per-user data isolation automatically — no API-level filtering needed.

---

## Dashboard (`/dashboard`)

Three sections:

**Stats row:**
- Total upscales (all time)
- Upscales this month
- Plan: Free
- Credits: 2× only (placeholder until Phase 4 Stripe)

**Past Upscales grid:**
- Jobs fetched server-side, newest first
- Each card: result image thumbnail, resolution, format, date, download link
- Empty state with link back to upscaler if no jobs yet

---

## Job Saving

- `/api/upscale` checks for a valid session cookie after Replicate completes
- If authenticated: insert row into `jobs` table
- If guest: skip — no job saved, no error

---

## New Files

```
middleware.ts                        ← session refresh on every request
lib/supabase/server.ts               ← server-side Supabase client
lib/supabase/client.ts               ← browser-side Supabase client
app/auth/callback/route.ts           ← OAuth/magic link callback handler
app/dashboard/page.tsx               ← protected dashboard page
components/auth/sign-in-modal.tsx    ← email + Google sign-in dialog
components/layout/user-menu.tsx      ← avatar dropdown (Dashboard + Sign Out)
```

---

## Modified Files

```
app/page.tsx                         ← pass session to navbar, save job after upscale
app/api/upscale/route.ts             ← save job to DB if authenticated
components/layout/navbar.tsx         ← show Sign In or UserMenu based on session
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Both are public (anon key is safe to expose — RLS enforces security).

---

## Out of Scope for Phase 3

- Stripe payments
- 4×/8× unlock for Pro users
- Email notifications
- Account deletion
- Admin dashboard
