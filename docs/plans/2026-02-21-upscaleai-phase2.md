# UpscaleAI Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mock 3s upscale delay with a real Replicate API call (nightmareai/real-esrgan), using Vercel Blob as temporary image storage.

**Architecture:** Two Next.js API routes handle all server-side work — `/api/upload` stores the image in Vercel Blob and returns a public URL, `/api/upscale` passes that URL to Replicate and returns the result URL. The browser awaits both sequentially. The blob is deleted after the user downloads. `ProcessingState` becomes a looping animation; the parent controls the state transition when the API call resolves.

**Tech Stack:** Next.js 16 App Router, TypeScript, `replicate` npm package, `@vercel/blob`

---

## Task 1: Install Dependencies & Configure Env

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env.local`

**Step 1: Install packages**

```bash
npm install replicate @vercel/blob
```

Expected: both packages appear in `package.json` dependencies.

**Step 2: Create `.env.local`**

```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

- `BLOB_READ_WRITE_TOKEN`: Vercel dashboard → Storage → Blob → Create store → copy token
- `REPLICATE_API_TOKEN`: replicate.com → Account Settings → API tokens

**Step 3: Verify build still passes**

Run: `npm run build`
Expected: clean build, no TypeScript errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add replicate and vercel blob dependencies"
```

---

## Task 2: Upload & Cleanup API Route

**Files:**
- Create: `app/api/upload/route.ts`

**Step 1: Create the route**

```typescript
// app/api/upload/route.ts
import { put, del } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('image') as File

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}

export async function DELETE(request: Request) {
  const { url } = await request.json() as { url: string }
  await del(url)
  return NextResponse.json({ success: true })
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: clean build.

**Step 3: Test upload with curl** (requires real `BLOB_READ_WRITE_TOKEN` in `.env.local`)

Start dev server: `npm run dev`

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "image=@/path/to/any/test.jpg" | jq .
```

Expected:
```json
{ "url": "https://xxxx.public.blob.vercel-storage.com/test-xxxx.jpg" }
```

**Step 4: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add upload and cleanup API route with Vercel Blob"
```

---

## Task 3: Upscale API Route

**Files:**
- Create: `app/api/upscale/route.ts`

**Step 1: Create the route**

```typescript
// app/api/upscale/route.ts
import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: Request) {
  const { imageUrl } = await request.json() as { imageUrl: string }

  if (!imageUrl) {
    return NextResponse.json({ error: 'No imageUrl provided' }, { status: 400 })
  }

  const output = await replicate.run(
    'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    { input: { image: imageUrl, scale: 2 } }
  ) as string

  return NextResponse.json({ resultUrl: output })
}
```

> **Note on version hash:** If the call fails with "version not found", go to replicate.com, open the `nightmareai/real-esrgan` model, copy the latest version hash from the Versions tab, and replace the hash above.

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: clean build.

**Step 3: Test with curl** (requires real tokens and a publicly accessible image URL)

```bash
curl -X POST http://localhost:3000/api/upscale \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"<paste a public image URL here>"}' | jq .
```

Expected after 5–30s:
```json
{ "resultUrl": "https://replicate.delivery/pbxt/..." }
```

**Step 4: Commit**

```bash
git add app/api/upscale/route.ts
git commit -m "feat: add upscale API route with Replicate real-esrgan"
```

---

## Task 4: Make ProcessingState a Looping Animation

`ProcessingState` currently drives the state transition via a 3s timer. With the real API, the parent controls completion — the component should loop indefinitely until unmounted.

**Files:**
- Modify: `components/upscaler/processing-state.tsx`

**Step 1: Replace the one-shot timer with an infinite loop, remove `onComplete` prop**

```tsx
// components/upscaler/processing-state.tsx
'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'

const MESSAGES = [
  'Analysing image...',
  'Enhancing details...',
  'Upscaling resolution...',
  'Applying AI refinements...',
  'Almost done...',
]

export function ProcessingState() {
  const [progress, setProgress] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    let p = 0
    const timer = setInterval(() => {
      p = p >= 95 ? 10 : p + 0.4
      setProgress(p)
      setMessageIndex(Math.floor((p / 100) * MESSAGES.length))
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="space-y-3 w-full max-w-sm">
        <div className="flex justify-between text-sm text-zinc-500">
          <span>{MESSAGES[messageIndex] ?? 'Processing...'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <p className="text-xs text-zinc-400">This may take 5–30 seconds</p>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript will flag `onComplete` prop usage in `page.tsx` — that's intentional, fixed in Task 5.

**Step 3: Commit**

```bash
git add components/upscaler/processing-state.tsx
git commit -m "feat: make processing state a looping animation"
```

---

## Task 5: Add `onAfterDownload` to DownloadButton

**Files:**
- Modify: `components/upscaler/download-button.tsx`

**Step 1: Add optional `onAfterDownload` prop**

```typescript
// components/upscaler/download-button.tsx
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface DownloadButtonProps {
  fileUrl: string
  fileName: string
  onAfterDownload?: () => void
}

export function DownloadButton({ fileUrl, fileName, onAfterDownload }: DownloadButtonProps) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    a.click()
    onAfterDownload?.()
  }

  return (
    <Button onClick={handleDownload} size="lg" className="w-full gap-2">
      <Download className="h-4 w-4" />
      Download Upscaled Image
    </Button>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: clean build.

**Step 3: Commit**

```bash
git add components/upscaler/download-button.tsx
git commit -m "feat: add onAfterDownload callback to DownloadButton"
```

---

## Task 6: Wire Real API Calls into page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add `blobUrl` and `resultUrl` state**

After the existing `const [error, setError] = useState...` line, add:

```tsx
const [blobUrl, setBlobUrl] = useState<string | null>(null)
const [resultUrl, setResultUrl] = useState<string | null>(null)
```

**Step 2: Replace mock handlers with real async flow**

Replace:
```tsx
const handleUpscale = () => {
  setState('processing')
}

const handleProcessingComplete = () => {
  setState('complete')
}
```

With:
```tsx
const handleUpscale = async () => {
  if (!uploadedFile) return
  setState('processing')
  setError(null)

  try {
    // 1. Upload to Vercel Blob
    const formData = new FormData()
    formData.append('image', uploadedFile.file)
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!uploadRes.ok) throw new Error('Upload failed. Please try again.')
    const { url } = await uploadRes.json() as { url: string }
    setBlobUrl(url)

    // 2. Upscale via Replicate
    const upscaleRes = await fetch('/api/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url }),
    })
    if (!upscaleRes.ok) throw new Error('Processing failed. Please try again.')
    const { resultUrl: result } = await upscaleRes.json() as { resultUrl: string }
    setResultUrl(result)
    setState('complete')
  } catch (err) {
    handleError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  }
}

const cleanupBlob = (url: string) => {
  fetch('/api/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).catch(() => {}) // fire-and-forget
}
```

**Step 3: Update the `processing` JSX block**

Replace:
```tsx
{state === 'processing' && (
  <ProcessingState onComplete={handleProcessingComplete} />
)}
```

With:
```tsx
{state === 'processing' && (
  <ProcessingState />
)}
```

**Step 4: Update `BeforeAfterSlider` to use real result**

Replace:
```tsx
afterUrl={uploadedFile.previewUrl}
```

With:
```tsx
afterUrl={resultUrl ?? uploadedFile.previewUrl}
```

**Step 5: Update `DownloadButton` to use real result and trigger cleanup**

Replace:
```tsx
<DownloadButton
  fileUrl={uploadedFile.previewUrl}
  fileName={`upscaled-${resolution}.${format}`}
/>
```

With:
```tsx
<DownloadButton
  fileUrl={resultUrl ?? uploadedFile.previewUrl}
  fileName={`upscaled-${resolution}.${format}`}
  onAfterDownload={() => { if (blobUrl) cleanupBlob(blobUrl) }}
/>
```

**Step 6: Reset `blobUrl` and `resultUrl` in the reset button**

Replace the `onClick` of "Upscale another image":
```tsx
onClick={() => {
  setState('idle')
  setUploadedFile(null)
  setProgress(0)
  setBlobUrl(null)
  setResultUrl(null)
}}
```

**Step 7: Verify build**

Run: `npm run build`
Expected: clean build, no TypeScript errors.

**Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire real Replicate + Vercel Blob into upscale flow"
```

---

## Task 7: End-to-End Browser Verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Walk the happy path**

1. Open http://localhost:3000
2. Upload a JPG/PNG/WEBP image
3. Confirm "2×" is selected; "4×" and "8×" show Pro badge and open paywall on click
4. Click "Upscale Image" — looping processing animation starts
5. Wait 5–30 seconds — state transitions to complete automatically
6. Before/after slider: left = original image, right = real Replicate output
7. Click "Download Upscaled Image" — file downloads, blob cleanup fires in background
8. Click "Upscale another image" — resets cleanly to idle

**Step 3: Test error path**

Set `REPLICATE_API_TOKEN=invalid` in `.env.local`, restart dev server, attempt upscale.
Expected: error message appears, UI returns to idle state with error shown.
Restore the correct token afterwards.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 2 real AI upscaling with Replicate + Vercel Blob"
```

---

## Done ✓

Phase 2 complete. Real AI upscaling is live for 2× — 4×/8× remain paywall-gated.

**Next steps (Phase 3):**
- Supabase auth (email + Google OAuth)
- Store jobs in Supabase DB (image URL, result URL, resolution, created_at)
- User dashboard with job history
- Wire 4×/8× for authenticated Pro users
- Stripe payments
