# UpscaleAI — Phase 4 Design Doc

**Date:** 2026-02-21
**Phase:** 4 — Stripe Payments & Plan Enforcement
**Status:** Approved

---

## Overview

Add Stripe Checkout for a Free vs Pro subscription model. Pro ($19/month) unlocks 4× and 8× upscales. Free users are capped at 5 upscales/month. Enforcement is server-side in `/api/upscale`.

---

## Approach

Stripe Checkout (hosted payment page) — zero payment UI to build, PCI compliant, handles cards and Apple Pay. One webhook updates the user's plan on success.

---

## Architecture

Three additions to the existing app:

1. **`profiles` table** — extends `auth.users` with `plan` (`free`/`pro`), `upscales_this_month`, and `month_reset_at`. A Postgres trigger auto-creates a profile row when a user signs up.
2. **`/api/stripe/checkout`** — creates a Stripe Checkout Session and returns a redirect URL to Stripe's hosted payment page.
3. **`/api/stripe/webhook`** — receives Stripe events. On `checkout.session.completed`, sets `plan = 'pro'` on the user's profile.

Enforcement lives in `/api/upscale` — reads the profile before calling Replicate, returns 403 if a free user has hit their monthly limit or is requesting a Pro-only resolution.

---

## Stripe Flow

1. User clicks **Upgrade to Pro** → POST `/api/stripe/checkout`
2. Server creates Checkout Session with Pro price, attaches `user_id` as metadata
3. User lands on Stripe's hosted page → pays → redirected to `/dashboard?upgraded=true`
4. Dashboard shows success banner if `?upgraded=true` in URL
5. In parallel: `checkout.session.completed` webhook → reads `user_id` from metadata → sets `profile.plan = 'pro'`
6. Guest users clicking Upgrade are redirected to sign in first

---

## Enforcement

`/api/upscale` checks before calling Replicate:

- **Guest** — always allowed (2× only, no saving — unchanged)
- **Free user** — check `upscales_this_month` vs limit of 5. At limit → 403. Under limit → run upscale, increment counter, reset counter if new month.
- **Pro user** — always allowed, no counter

4×/8× resolution gate moves from client-side only to **server-side** — passing a restricted resolution returns 403 regardless of client.

---

## Database Schema

```sql
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  plan                text not null default 'free',
  upscales_this_month int not null default 0,
  month_reset_at      timestamptz not null default date_trunc('month', now())
);

alter table profiles enable row level security;
create policy "users own their profile" on profiles
  for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## UI Changes

- **Dashboard** — plan badge (Free/Pro), upscale count (`3/5 this month`), **Upgrade to Pro** button for free users, success banner when `?upgraded=true`
- **Paywall modal** — Upgrade button POSTs to `/api/stripe/checkout` and redirects (replaces placeholder)
- **ResolutionSelector** — unchanged client-side behaviour (Pro badge on 4×/8×), but server now also enforces it

---

## Environment Variables

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

---

## New Files

```
app/api/stripe/checkout/route.ts   ← create Checkout Session
app/api/stripe/webhook/route.ts    ← handle checkout.session.completed
```

## Modified Files

```
app/api/upscale/route.ts           ← enforce plan limits and resolution gate
app/dashboard/page.tsx             ← plan badge, usage count, upgrade button, success banner
components/upscaler/paywall-modal.tsx ← wire Upgrade button to /api/stripe/checkout
supabase/migrations/               ← profiles table + trigger
```

---

## Out of Scope for Phase 4

- Stripe Customer Portal (manage/cancel subscription)
- Annual pricing
- Email notifications on upgrade
- Admin dashboard
