# UpscaleAI Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page AI image upscaler UI with mock processing — upload, select resolution/format, fake 3s upscale, before/after slider, download.

**Architecture:** Single `app/page.tsx` owns the state machine (idle → uploading → ready → processing → complete → error). All upscaler components live in `components/upscaler/`. No real API calls — mock delay simulates processing. shadcn components + Tailwind for all UI.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui (already installed), lucide-react

---

## Task 1: Types & State

**Files:**
- Create: `lib/upscaler-types.ts`
- Modify: `app/page.tsx`

**Step 1: Create types file**

```ts
// lib/upscaler-types.ts
export type UpscaleState = 'idle' | 'uploading' | 'ready' | 'processing' | 'complete' | 'error'
export type Resolution = '2x' | '4x' | '8x'
export type OutputFormat = 'jpg' | 'png' | 'webp' | 'tiff'

export interface UploadedFile {
  file: File
  previewUrl: string
  width: number
  height: number
}
```

**Step 2: Replace page.tsx with state machine shell**

```tsx
// app/page.tsx
'use client'

import { useState } from 'react'
import type { UpscaleState, Resolution, OutputFormat, UploadedFile } from '@/lib/upscaler-types'

export default function Home() {
  const [state, setState] = useState<UpscaleState>('idle')
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [resolution, setResolution] = useState<Resolution>('2x')
  const [format, setFormat] = useState<OutputFormat>('jpg')
  const [progress, setProgress] = useState(0)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="min-h-screen bg-white">
      <p className="p-8 text-zinc-500">UpscaleAI — state: {state}</p>
    </main>
  )
}
```

**Step 3: Verify in browser**

Run: `npm run dev` (already running at http://localhost:3000)
Expected: White page showing "UpscaleAI — state: idle"

**Step 4: Commit**

```bash
git add lib/upscaler-types.ts app/page.tsx
git commit -m "feat: add upscaler types and page state machine shell"
```

---

## Task 2: Navbar

**Files:**
- Create: `components/layout/navbar.tsx`
- Modify: `app/page.tsx`

**Step 1: Create Navbar**

```tsx
// components/layout/navbar.tsx
import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <header className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-zinc-900">
          UpscaleAI
        </span>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </div>
    </header>
  )
}
```

**Step 2: Add Navbar to page.tsx**

Replace the `<main>` content in `app/page.tsx`:

```tsx
import { Navbar } from '@/components/layout/navbar'

// inside return:
<main className="min-h-screen bg-white">
  <Navbar />
  <p className="p-8 text-zinc-500">state: {state}</p>
</main>
```

**Step 3: Verify in browser**

Expected: White nav bar with "UpscaleAI" on left, "Sign In" button on right, thin bottom border.

**Step 4: Commit**

```bash
git add components/layout/navbar.tsx app/page.tsx
git commit -m "feat: add navbar with logo and sign in button"
```

---

## Task 3: Hero Section

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add hero section below Navbar in page.tsx**

```tsx
{/* Hero */}
<section className="mx-auto max-w-5xl px-6 pt-16 pb-10 text-center">
  <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
    Upscale your images with AI
  </h1>
  <p className="mt-4 text-lg text-zinc-500">
    Enlarge photos to 2K, 4K, or Ultra HD — without losing quality.
  </p>
  <div className="mt-6 flex items-center justify-center gap-6 text-sm text-zinc-400">
    <span>✓ No account required</span>
    <span>✓ Free 2x upscale</span>
    <span>✓ Instant results</span>
  </div>
</section>
```

**Step 2: Verify in browser**

Expected: Centered heading, subtitle, and 3 trust badges below the nav.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add hero section with heading and trust badges"
```

---

## Task 4: Upload Zone

**Files:**
- Create: `components/upscaler/upload-zone.tsx`
- Modify: `app/page.tsx`

**Step 1: Create UploadZone component**

```tsx
// components/upscaler/upload-zone.tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UploadedFile } from '@/lib/upscaler-types'

interface UploadZoneProps {
  onUpload: (file: UploadedFile) => void
  onError: (message: string) => void
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export function UploadZone({ onUpload, onError }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      onError('Unsupported format. Please upload JPG, PNG, or WEBP.')
      return
    }
    if (file.size > MAX_BYTES) {
      onError('File too large. Maximum size is 10MB.')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      onUpload({ file, previewUrl, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = previewUrl
  }, [onUpload, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 transition-colors',
        dragging
          ? 'border-zinc-400 bg-zinc-50'
          : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100'
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
        <Upload className="h-6 w-6 text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="font-medium text-zinc-700">
          Drop your image here, or <span className="text-zinc-900 underline underline-offset-2">browse</span>
        </p>
        <p className="mt-1 text-sm text-zinc-400">JPG, PNG, WEBP — up to 10MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
```

**Step 2: Wire UploadZone into page.tsx**

Add below the hero section:

```tsx
import { UploadZone } from '@/components/upscaler/upload-zone'

// handler functions (add before return):
const handleUpload = (file: UploadedFile) => {
  setUploadedFile(file)
  setState('ready')
  setError(null)
}

const handleError = (message: string) => {
  setError(message)
  setState('error')
}

// in JSX, below hero section:
<section className="mx-auto max-w-5xl px-6 pb-24">
  {state === 'idle' || state === 'error' ? (
    <div className="space-y-3">
      <UploadZone onUpload={handleUpload} onError={handleError} />
      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  ) : null}
</section>
```

**Step 3: Verify in browser**

Expected: Large dashed upload zone. Drag a JPG/PNG/WEBP onto it — state should change to "ready" (visible in state debug text). Try a .gif — should show error message.

**Step 4: Commit**

```bash
git add components/upscaler/upload-zone.tsx app/page.tsx
git commit -m "feat: add drag-and-drop upload zone with validation"
```

---

## Task 5: Resolution & Format Selectors

**Files:**
- Create: `components/upscaler/resolution-selector.tsx`
- Create: `components/upscaler/format-selector.tsx`
- Modify: `app/page.tsx`

**Step 1: Create ResolutionSelector**

```tsx
// components/upscaler/resolution-selector.tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Resolution } from '@/lib/upscaler-types'

interface ResolutionSelectorProps {
  value: Resolution
  onChange: (value: Resolution) => void
  onProAttempt: () => void
}

const options: { value: Resolution; label: string; desc: string; pro: boolean }[] = [
  { value: '2x', label: '2×', desc: '2K', pro: false },
  { value: '4x', label: '4×', desc: '4K', pro: true },
  { value: '8x', label: '8×', desc: 'Ultra HD', pro: true },
]

export function ResolutionSelector({ value, onChange, onProAttempt }: ResolutionSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700">Resolution</label>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => opt.pro ? onProAttempt() : onChange(opt.value)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-4 text-sm font-medium transition-colors',
              value === opt.value && !opt.pro
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
            )}
          >
            <span className="text-lg font-bold">{opt.label}</span>
            <span className="text-xs opacity-70">{opt.desc}</span>
            {opt.pro && (
              <Badge variant="secondary" className="absolute -top-2 right-2 text-[10px]">
                Pro
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create FormatSelector**

```tsx
// components/upscaler/format-selector.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OutputFormat } from '@/lib/upscaler-types'

interface FormatSelectorProps {
  value: OutputFormat
  onChange: (value: OutputFormat) => void
  onProAttempt: () => void
}

export function FormatSelector({ value, onChange, onProAttempt }: FormatSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700">Output Format</label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === 'tiff') { onProAttempt(); return }
          onChange(v as OutputFormat)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="jpg">JPG</SelectItem>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="webp">WEBP</SelectItem>
          <SelectItem value="tiff">TIFF — Pro only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
```

**Step 3: Add selectors to page.tsx**

Add after `{state === 'idle' || state === 'error'}` block:

```tsx
import { ResolutionSelector } from '@/components/upscaler/resolution-selector'
import { FormatSelector } from '@/components/upscaler/format-selector'
import { Button } from '@/components/ui/button'

// add this block in the section, after the idle/error block:
{state === 'ready' && uploadedFile && (
  <div className="space-y-6">
    {/* Image preview */}
    <div className="overflow-hidden rounded-2xl border border-zinc-100">
      <img src={uploadedFile.previewUrl} alt="Uploaded" className="max-h-72 w-full object-contain bg-zinc-50" />
    </div>
    <p className="text-sm text-zinc-400 text-center">
      {uploadedFile.width} × {uploadedFile.height}px · {(uploadedFile.file.size / 1024 / 1024).toFixed(1)}MB
    </p>
    <div className="grid grid-cols-2 gap-4">
      <ResolutionSelector
        value={resolution}
        onChange={setResolution}
        onProAttempt={() => setPaywallOpen(true)}
      />
      <FormatSelector
        value={format}
        onChange={setFormat}
        onProAttempt={() => setPaywallOpen(true)}
      />
    </div>
    <Button className="w-full" size="lg" onClick={handleUpscale}>
      Upscale Image
    </Button>
  </div>
)}
```

Also add stub handler before `return`:

```tsx
const handleUpscale = () => {
  setState('processing')
}
```

**Step 4: Verify in browser**

Upload an image — should see preview, resolution buttons (4x/8x show "Pro" badge), format dropdown, and "Upscale Image" button. Clicking 4x/8x or TIFF does nothing yet (paywall not built). Clicking "Upscale Image" changes state to "processing".

**Step 5: Commit**

```bash
git add components/upscaler/resolution-selector.tsx components/upscaler/format-selector.tsx app/page.tsx
git commit -m "feat: add resolution and format selectors with pro gating"
```

---

## Task 6: Processing State

**Files:**
- Create: `components/upscaler/processing-state.tsx`
- Modify: `app/page.tsx`

**Step 1: Create ProcessingState**

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

interface ProcessingStateProps {
  onComplete: () => void
}

export function ProcessingState({ onComplete }: ProcessingStateProps) {
  const [progress, setProgress] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const duration = 3000
    const interval = 50
    const steps = duration / interval
    let step = 0

    const timer = setInterval(() => {
      step++
      const p = Math.min((step / steps) * 100, 99)
      setProgress(p)
      setMessageIndex(Math.floor((p / 100) * MESSAGES.length))
      if (step >= steps) {
        clearInterval(timer)
        setProgress(100)
        setTimeout(onComplete, 200)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="space-y-3 w-full max-w-sm">
        <div className="flex justify-between text-sm text-zinc-500">
          <span>{MESSAGES[messageIndex] ?? 'Processing...'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <p className="text-xs text-zinc-400">Estimated time: ~5–15 seconds</p>
    </div>
  )
}
```

**Step 2: Add ProcessingState to page.tsx**

Add handler and JSX block:

```tsx
import { ProcessingState } from '@/components/upscaler/processing-state'

// handler:
const handleProcessingComplete = () => {
  setState('complete')
}

// JSX block:
{state === 'processing' && (
  <ProcessingState onComplete={handleProcessingComplete} />
)}
```

**Step 3: Verify in browser**

Upload → Upscale → see animated progress bar cycling through messages over 3 seconds, then state changes to "complete".

**Step 4: Commit**

```bash
git add components/upscaler/processing-state.tsx app/page.tsx
git commit -m "feat: add animated processing state with progress bar"
```

---

## Task 7: Before/After Slider

**Files:**
- Create: `components/upscaler/before-after-slider.tsx`
- Modify: `app/page.tsx`

**Step 1: Create BeforeAfterSlider**

```tsx
// components/upscaler/before-after-slider.tsx
'use client'

import { useCallback, useRef, useState } from 'react'

interface BeforeAfterSliderProps {
  beforeUrl: string
  afterUrl: string
  beforeDimensions: { width: number; height: number }
  afterDimensions: { width: number; height: number }
}

export function BeforeAfterSlider({ beforeUrl, afterUrl, beforeDimensions, afterDimensions }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  const onMouseDown = () => { dragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => { if (dragging.current) updatePosition(e.clientX) }
  const onMouseUp = () => { dragging.current = false }
  const onTouchMove = (e: React.TouchEvent) => updatePosition(e.touches[0].clientX)

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-zinc-100 select-none cursor-col-resize"
        style={{ aspectRatio: `${beforeDimensions.width}/${beforeDimensions.height}` }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
      >
        {/* After (full width underneath) */}
        <img src={afterUrl} alt="Upscaled" className="absolute inset-0 w-full h-full object-cover" />

        {/* Before (clipped to left portion) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img src={beforeUrl} alt="Original" className="absolute inset-0 h-full object-cover" style={{ width: containerRef.current?.offsetWidth ?? '100%' }} />
        </div>

        {/* Divider */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${position}%` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 4l-3 4 3 4M11 4l3 4-3 4" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
          Original · {beforeDimensions.width}×{beforeDimensions.height}
        </div>
        <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
          Upscaled · {afterDimensions.width}×{afterDimensions.height}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Add complete state to page.tsx**

```tsx
import { BeforeAfterSlider } from '@/components/upscaler/before-after-slider'

// compute mock upscaled dimensions based on resolution:
const getUpscaledDimensions = (width: number, height: number, res: Resolution) => {
  const factor = res === '2x' ? 2 : res === '4x' ? 4 : 8
  return { width: width * factor, height: height * factor }
}

// JSX block:
{state === 'complete' && uploadedFile && (
  <div className="space-y-6">
    <BeforeAfterSlider
      beforeUrl={uploadedFile.previewUrl}
      afterUrl={uploadedFile.previewUrl}
      beforeDimensions={{ width: uploadedFile.width, height: uploadedFile.height }}
      afterDimensions={getUpscaledDimensions(uploadedFile.width, uploadedFile.height, resolution)}
    />
  </div>
)}
```

**Step 3: Verify in browser**

Upload → upscale → drag the slider handle left/right. Labels show original vs upscaled pixel dimensions. Works on touch.

**Step 4: Commit**

```bash
git add components/upscaler/before-after-slider.tsx app/page.tsx
git commit -m "feat: add before/after comparison slider with drag handle"
```

---

## Task 8: Download Button & Upsell Banner

**Files:**
- Create: `components/upscaler/download-button.tsx`
- Create: `components/upscaler/upsell-banner.tsx`
- Modify: `app/page.tsx`

**Step 1: Create DownloadButton**

```tsx
// components/upscaler/download-button.tsx
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface DownloadButtonProps {
  fileUrl: string
  fileName: string
}

export function DownloadButton({ fileUrl, fileName }: DownloadButtonProps) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    a.click()
  }

  return (
    <Button onClick={handleDownload} size="lg" className="w-full gap-2">
      <Download className="h-4 w-4" />
      Download Upscaled Image
    </Button>
  )
}
```

**Step 2: Create UpsellBanner**

```tsx
// components/upscaler/upsell-banner.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UpsellBannerProps {
  onUpgrade: () => void
}

export function UpsellBanner({ onUpgrade }: UpsellBannerProps) {
  return (
    <Card className="border-zinc-200 bg-zinc-50">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-zinc-800">
            Want 4K or 8K Ultra HD?
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Upgrade to Pro — from $9/month. Unlimited upscales.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">Pro</Badge>
          <Button size="sm" onClick={onUpgrade}>Upgrade</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Add to complete state in page.tsx**

```tsx
import { DownloadButton } from '@/components/upscaler/download-button'
import { UpsellBanner } from '@/components/upscaler/upsell-banner'

// inside the complete state block, below BeforeAfterSlider:
<DownloadButton
  fileUrl={uploadedFile.previewUrl}
  fileName={`upscaled-${resolution}.${format}`}
/>
<UpsellBanner onUpgrade={() => setPaywallOpen(true)} />
<Button variant="ghost" className="w-full text-zinc-400" onClick={() => {
  setState('idle')
  setUploadedFile(null)
  setProgress(0)
}}>
  Upscale another image
</Button>
```

**Step 4: Verify in browser**

After processing completes: see download button, upsell banner, and "Upscale another image" reset button. Download button triggers browser download of the original image.

**Step 5: Commit**

```bash
git add components/upscaler/download-button.tsx components/upscaler/upsell-banner.tsx app/page.tsx
git commit -m "feat: add download button, upsell banner, and reset flow"
```

---

## Task 9: Paywall Modal

**Files:**
- Create: `components/upscaler/paywall-modal.tsx`
- Modify: `app/page.tsx`

**Step 1: Create PaywallModal**

```tsx
// components/upscaler/paywall-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
}

const plans = [
  { name: 'Starter', price: '$9/mo', upscales: '30 upscales', resolutions: 'Up to 4K' },
  { name: 'Pro', price: '$19/mo', upscales: '100 upscales', resolutions: 'Up to 8K', popular: true },
  { name: 'Unlimited', price: '$39/mo', upscales: 'Unlimited', resolutions: 'All resolutions' },
]

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            4K, 8K Ultra HD, and TIFF output are available on paid plans.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                plan.popular ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{plan.name}</span>
                  {plan.popular && <Badge variant="default" className="text-[10px]">Popular</Badge>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{plan.upscales} · {plan.resolutions}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900">{plan.price}</p>
                <Button size="sm" variant={plan.popular ? 'default' : 'outline'} className="mt-1" onClick={onClose}>
                  Choose
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-zinc-400">Payments via Stripe · Cancel anytime</p>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add PaywallModal to page.tsx**

```tsx
import { PaywallModal } from '@/components/upscaler/paywall-modal'

// anywhere in the JSX (outside the section):
<PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
```

**Step 3: Verify in browser**

Click 4x or 8x resolution — modal should open showing 3 pricing plans. Close button and clicking "Choose" should dismiss it.

**Step 4: Commit**

```bash
git add components/upscaler/paywall-modal.tsx app/page.tsx
git commit -m "feat: add paywall modal with pricing plans"
```

---

## Task 10: Final Polish

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Step 1: Remove state debug text from page.tsx**

Delete the `<p className="p-8 text-zinc-500">state: {state}</p>` debug line.

**Step 2: Update layout.tsx metadata**

```tsx
export const metadata: Metadata = {
  title: 'UpscaleAI — AI Image Upscaler',
  description: 'Upscale your images to 2K, 4K, or Ultra HD using AI. Free 2x upscale, no account required.',
}
```

**Step 3: Wrap tool section in a Card for visual polish**

In page.tsx, wrap the tool section content in:

```tsx
<div className="rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm">
  {/* all state blocks */}
</div>
```

**Step 4: Verify full flow in browser**

Walk through the complete happy path:
1. Page loads — nav + hero + upload zone ✓
2. Upload a JPG — preview + selectors appear ✓
3. Click "Upscale Image" — progress bar animates for 3s ✓
4. Processing completes — before/after slider appears ✓
5. Drag slider — images compare ✓
6. Click "Download Upscaled Image" — download triggers ✓
7. Upsell banner visible ✓
8. Click "Upscale another image" — resets to idle ✓
9. Select 4x/8x/TIFF — paywall modal opens ✓

**Step 5: Final commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: complete Phase 1 UpscaleAI UI with full upscaler flow"
```

---

## Done ✓

Phase 1 complete. The full upscaler UX is functional with mock processing.

**Next steps (Phase 2):**
- Add Supabase auth (email + Google OAuth)
- Replace mock processing with real Replicate API call
- Store jobs in Supabase DB
- Build user dashboard
