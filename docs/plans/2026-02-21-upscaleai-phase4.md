# UpscaleAI Phase 4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Stripe Checkout for Free vs Pro ($19/month) plans, enforce 5 upscales/month for free users, and server-side unlock 4×/8× for Pro users.

**Architecture:** A `profiles` table tracks each user's plan and monthly usage. `/api/stripe/checkout` creates a Checkout Session; `/api/stripe/webhook` upgrades the plan on payment. `/api/upscale` enforces limits and resolution gates before calling Replicate.

**Tech Stack:** Next.js 16 App Router, TypeScript, `stripe` npm package, Supabase Postgres (profiles table + trigger), Stripe Checkout + Webhooks

---

## Task 1: Set Up Stripe & Configure Env Vars

Manual steps. No code changes.

**Files:**
- Modify: `.env.local`

**Step 1: Create a Stripe account**

Go to [stripe.com](https://stripe.com) → sign up or log in. Make sure **Test mode** is on (toggle in the top-right — should say "Test mode").

**Step 2: Create the Pro product and price**

- Stripe dashboard → **Product catalog** → **Add product**
- Name: `Pro Plan`
- Pricing model: **Recurring**
- Price: `$19.00` / `month`
- Click **Save product**
- Copy the **Price ID** (starts with `price_`) → this is `STRIPE_PRO_PRICE_ID`

**Step 3: Get the Stripe secret key**

- Stripe dashboard → **Developers** → **API keys**
- Copy **Secret key** (starts with `sk_test_`) → `STRIPE_SECRET_KEY`

**Step 4: Get the Supabase service role key**

- Supabase dashboard → **Project Settings** → **API**
- Under "Project API keys", copy the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

**Step 5: Add to `.env.local`**

Add these four lines (keep the existing ones):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_placeholder
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Leave `STRIPE_WEBHOOK_SECRET=whsec_placeholder` for now — it gets filled in during Task 11.

**Step 6: Install the stripe package**

```bash
npm install stripe
```

**Step 7: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 8: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install stripe package"
```

---

## Task 2: Create Profiles Table in Supabase

Manual steps + migration file commit.

**Files:**
- Create: `supabase/migrations/20260221_create_profiles.sql`

**Step 1: Open the Supabase SQL editor**

Supabase dashboard → **SQL Editor** → **New query**.

**Step 2: Run this SQL**

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

-- Auto-create profile row when a new user signs up
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

-- Backfill existing users (safe to run multiple times)
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;
```

**Step 3: Verify**

In Supabase **Table Editor**, confirm the `profiles` table exists with columns `id`, `plan`, `upscales_this_month`, `month_reset_at`. RLS shield should be green. Your existing user account should have a row with `plan = 'free'`.

**Step 4: Save migration file and commit**

Create `supabase/migrations/20260221_create_profiles.sql` with the SQL from Step 2.

```bash
git add supabase/migrations/20260221_create_profiles.sql
git commit -m "feat: add profiles table with plan tracking and trigger"
```

---

## Task 3: Supabase Admin Client

Needed by the Stripe webhook to update any user's profile without a session cookie.

**Files:**
- Create: `lib/supabase/admin.ts`

**Step 1: Create the file**

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This uses the service role key which bypasses RLS. Only use it in server-side routes that need to write to other users' rows.

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat: add supabase admin client for service-role operations"
```

---

## Task 4: Stripe Checkout Route

**Files:**
- Create: `app/api/stripe/checkout/route.ts`

**Step 1: Create the route**

```typescript
// app/api/stripe/checkout/route.ts
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
    },
    success_url: `${origin}/dashboard?upgraded=true`,
    cancel_url: `${origin}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build, `/api/stripe/checkout` appears as a dynamic route.

**Step 3: Commit**

```bash
git add app/api/stripe/checkout/route.ts
git commit -m "feat: add stripe checkout session route"
```

---

## Task 5: Stripe Webhook Route

**Files:**
- Create: `app/api/stripe/webhook/route.ts`

**Step 1: Create the route**

```typescript
// app/api/stripe/webhook/route.ts
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id

    if (userId) {
      const supabase = createAdminClient()
      await supabase
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build, `/api/stripe/webhook` appears as a dynamic route.

**Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: add stripe webhook to upgrade user plan on payment"
```

---

## Task 6: Enforce Limits in /api/upscale

**Files:**
- Modify: `app/api/upscale/route.ts`

**Step 1: Replace the entire file**

```typescript
// app/api/upscale/route.ts
import Replicate from 'replicate'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

const FREE_MONTHLY_LIMIT = 5
const PRO_RESOLUTIONS = ['4x', '8x']
const SCALE_MAP: Record<string, number> = { '2x': 2, '4x': 4, '8x': 8 }

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('image') as File
  const resolution = (formData.get('resolution') as string) ?? '2x'
  const format = (formData.get('format') as string) ?? 'jpg'

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Profile-based enforcement for authenticated users
  let userProfile: { plan: string; upscales_this_month: number } | null = null

  if (user) {
    let { data: profile } = await supabase
      .from('profiles')
      .select('plan, upscales_this_month, month_reset_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Create profile if missing (users who signed up before Phase 4)
      await supabase.from('profiles').insert({ id: user.id })
      profile = { plan: 'free', upscales_this_month: 0, month_reset_at: new Date().toISOString() }
    }

    // Reset counter if a new month has started
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    if (new Date(profile.month_reset_at) < monthStart) {
      await supabase
        .from('profiles')
        .update({ upscales_this_month: 0, month_reset_at: monthStart.toISOString() })
        .eq('id', user.id)
      profile.upscales_this_month = 0
    }

    // Enforce Pro-only resolutions
    if (profile.plan === 'free' && PRO_RESOLUTIONS.includes(resolution)) {
      return NextResponse.json(
        { error: 'Pro plan required for 4x and 8x upscaling', code: 'UPGRADE_REQUIRED' },
        { status: 403 }
      )
    }

    // Enforce monthly limit for free users
    if (profile.plan === 'free' && profile.upscales_this_month >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: 'Monthly limit reached. Upgrade to Pro for unlimited upscales.', code: 'LIMIT_REACHED' },
        { status: 403 }
      )
    }

    userProfile = profile
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const dataUri = `data:${file.type};base64,${base64}`
  const scale = SCALE_MAP[resolution] ?? 2

  let output: unknown
  try {
    output = await replicate.run(
      'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
      { input: { image: dataUri, scale, face_enhance: true } }
    )
  } catch (err) {
    console.error('Replicate error:', JSON.stringify(err, null, 2))
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const resultUrl = typeof output === 'string' ? output : String(output)

  // Save job and increment usage counter for authenticated users
  if (user && userProfile) {
    await supabase.from('jobs').insert({
      user_id: user.id,
      result_url: resultUrl,
      resolution,
      format,
    })
    await supabase
      .from('profiles')
      .update({ upscales_this_month: userProfile.upscales_this_month + 1 })
      .eq('id', user.id)
  }

  return NextResponse.json({ resultUrl })
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit**

```bash
git add app/api/upscale/route.ts
git commit -m "feat: enforce plan limits and resolution gate in upscale route"
```

---

## Task 7: Upgrade Button Component

A reusable client component used in the dashboard and paywall modal.

**Files:**
- Create: `components/dashboard/upgrade-button.tsx`

**Step 1: Create the component**

```tsx
// components/dashboard/upgrade-button.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface UpgradeButtonProps {
  label?: string
  size?: 'sm' | 'default' | 'lg'
}

export function UpgradeButton({ label = 'Upgrade to Pro — $19/month', size = 'default' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      if (res.status === 401) {
        // Not signed in — reload so the user can sign in from the navbar
        window.location.href = '/'
        return
      }
      const { url } = await res.json() as { url: string }
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleUpgrade} disabled={loading} size={size}>
      {loading ? 'Redirecting...' : label}
    </Button>
  )
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit**

```bash
git add components/dashboard/upgrade-button.tsx
git commit -m "feat: add upgrade button component that triggers stripe checkout"
```

---

## Task 8: Update Dashboard Page

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Replace the entire file**

```tsx
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpgradeButton } from '@/components/dashboard/upgrade-button'

interface Job {
  id: string
  result_url: string
  resolution: string
  format: string
  created_at: string
}

interface Profile {
  plan: string
  upscales_this_month: number
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const date = new Date(job.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <div className="aspect-square overflow-hidden bg-zinc-50">
        <img
          src={job.result_url}
          alt="Upscaled image"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-zinc-400">
          {job.resolution.toUpperCase()} · {job.format.toUpperCase()} · {date}
        </p>
        <a
          href={job.result_url}
          download
          className="mt-2 flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline"
        >
          ↓ Download
        </a>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const params = await searchParams
  const justUpgraded = params.upgraded === 'true'

  const [{ data: jobs }, { data: profile }] = await Promise.all([
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan, upscales_this_month').eq('id', user.id).single(),
  ])

  const allJobs = jobs ?? []
  const userProfile: Profile = profile ?? { plan: 'free', upscales_this_month: 0 }
  const isPro = userProfile.plan === 'pro'
  const usageLabel = isPro ? 'Unlimited' : `${userProfile.upscales_this_month} / 5 this month`

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-12">

        {justUpgraded && (
          <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            You're now on Pro. Enjoy unlimited upscales and 4×/8× resolutions.
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
          {!isPro && <UpgradeButton size="sm" label="Upgrade to Pro" />}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
          <StatCard label="Total upscales" value={allJobs.length} />
          <StatCard label="Usage" value={usageLabel} />
          <StatCard label="Plan" value={isPro ? 'Pro' : 'Free'} />
          <StatCard label="Resolutions" value={isPro ? '2× 4× 8×' : '2× only'} />
        </div>

        {/* Upgrade CTA for free users */}
        {!isPro && (
          <div className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Upgrade to Pro</p>
              <p className="text-sm text-zinc-500 mt-0.5">Unlimited upscales · 4× and 8× resolutions · $19/month</p>
            </div>
            <UpgradeButton label="Upgrade — $19/mo" />
          </div>
        )}

        {/* Jobs */}
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Past Upscales</h2>
        {allJobs.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p>No upscales yet.</p>
            <a href="/" className="mt-2 inline-block text-sm text-zinc-900 underline underline-offset-2">
              Upscale your first image →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {allJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: update dashboard with plan info, usage stats, and upgrade CTA"
```

---

## Task 9: Update Paywall Modal

Replace the old multi-tier placeholder with a single Pro upgrade action.

**Files:**
- Modify: `components/upscaler/paywall-modal.tsx`

**Step 1: Replace the entire file**

```tsx
// components/upscaler/paywall-modal.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { UpgradeButton } from '@/components/dashboard/upgrade-button'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            Get unlimited upscales and unlock 4× and 8× resolutions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>✓ Unlimited upscales</li>
            <li>✓ 4× and 8× resolutions</li>
            <li>✓ Cancel anytime</li>
          </ul>
          <UpgradeButton label="Upgrade to Pro — $19/month" size="default" />
        </div>
        <p className="text-center text-xs text-zinc-400">Payments via Stripe · Cancel anytime</p>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit**

```bash
git add components/upscaler/paywall-modal.tsx
git commit -m "feat: update paywall modal to use stripe checkout"
```

---

## Task 10: Handle 403 in page.tsx

When the API returns 403 (limit reached or Pro-only resolution), show the paywall modal instead of an error message.

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update `handleUpscale` in `app/page.tsx`**

Find the current `handleUpscale` function and replace the try block:

```tsx
const handleUpscale = async () => {
  if (!uploadedFile) return
  setState('processing')
  setError(null)

  try {
    const formData = new FormData()
    formData.append('image', uploadedFile.file)
    formData.append('resolution', resolution)
    formData.append('format', format)
    const upscaleRes = await fetch('/api/upscale', { method: 'POST', body: formData })

    if (upscaleRes.status === 403) {
      setState('ready')
      setPaywallOpen(true)
      return
    }

    if (!upscaleRes.ok) throw new Error('Processing failed. Please try again.')
    const { resultUrl: result } = await upscaleRes.json() as { resultUrl: string }
    setResultUrl(result)
    setState('complete')
  } catch (err) {
    handleError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  }
}
```

The only change is adding the `if (upscaleRes.status === 403)` block before the generic `if (!upscaleRes.ok)` check.

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: open paywall modal on 403 from upscale API"
```

---

## Task 11: Set Up Stripe Webhook

Manual step to connect Stripe to your local dev server.

**Step 1: Install the Stripe CLI**

```bash
brew install stripe/stripe-cli/stripe
```

**Step 2: Log in**

```bash
stripe login
```

Follow the browser prompt to authenticate.

**Step 3: Forward webhook events to your local server**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will print a webhook signing secret that starts with `whsec_`. Copy it.

**Step 4: Update `.env.local`**

Replace `whsec_placeholder` with the real webhook secret:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart the dev server so the new env var is picked up.

**Step 5: Trigger a test event**

In a separate terminal:

```bash
stripe trigger checkout.session.completed
```

Check the Stripe CLI output — it should show `200 OK` from your webhook. Check Supabase Table Editor → `profiles` — your test user's `plan` column should now be `pro`.

> **Note:** The `stripe trigger` test event uses a fake `user_id` in metadata so it won't actually update a real user row. To do a real end-to-end test, complete a full checkout using Stripe's test card `4242 4242 4242 4242` (any future expiry, any CVC).

---

## Task 12: End-to-End Verification

**Step 1: Run the dev server**

```bash
npm run dev
```

Also keep `stripe listen --forward-to localhost:3000/api/stripe/webhook` running in a separate terminal.

**Step 2: Test free user limit enforcement**

1. Sign in, go to the upscaler
2. Manually set `upscales_this_month = 5` in Supabase Table Editor for your profile row
3. Try to upscale → the paywall modal should open instead of processing

**Step 3: Test Pro resolution gate**

1. Reset `upscales_this_month` to 0 in Supabase
2. Try to select 4× and click Upscale → paywall modal opens

**Step 4: Test upgrade flow**

1. Click **Upgrade to Pro** in the paywall modal
2. Stripe Checkout page opens
3. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. Click **Subscribe**
5. Redirected to `/dashboard?upgraded=true` with success banner
6. Supabase `profiles` table → `plan` = `pro`
7. Go back to upscaler → 4× and 8× now work without the paywall

**Step 5: Verify dashboard**

1. Dashboard shows **Pro** plan badge
2. Usage shows **Unlimited**
3. No upgrade CTA visible

---

## Done ✓

Phase 4 complete. Users can subscribe to Pro ($19/month) via Stripe Checkout, plan limits are enforced server-side, and the dashboard reflects the user's current plan and usage.

**Next steps (Phase 5):**
- Stripe Customer Portal (manage/cancel subscription)
- Webhook for `customer.subscription.deleted` → downgrade to free
- Annual pricing option
