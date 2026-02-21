# UpscaleAI — Phase 2 Design Doc

**Date:** 2026-02-21
**Phase:** 2 — Real AI Processing (Replicate + Vercel Blob)
**Status:** Approved

---

## Overview

Replace the mock 3-second processing delay with a real Replicate API call using the `nightmareai/real-esrgan` model. Images are temporarily stored in Vercel Blob to get a public URL for Replicate, then cleaned up after download. Only 2× upscaling is wired up — 4× and 8× remain paywall-gated.

---

## Architecture

Two Next.js API routes handle all server-side work. The browser never talks to Replicate or Vercel Blob directly.

```
Browser
  → POST /api/upload       (image file → Vercel Blob → returns blobUrl)
  → POST /api/upscale      (blobUrl → Replicate real-esrgan → returns resultUrl)
  → DELETE /api/upload     (blobUrl → Vercel Blob del → cleanup)
```

---

## API Routes

### `POST /api/upload`
- Accepts `multipart/form-data` with the image file
- Calls `put(filename, file, { access: 'public' })` from `@vercel/blob`
- Returns `{ url: string }` — public Vercel Blob URL
- Reuses same validation: JPG/PNG/WEBP, 10MB max

### `POST /api/upscale`
- Accepts `{ imageUrl: string, resolution: '2x' }`
- Calls Replicate: model `nightmareai/real-esrgan`, input `{ image: imageUrl, scale: 2 }`
- Awaits prediction synchronously via `replicate.run()`
- Returns `{ resultUrl: string }` — Replicate output URL

### `DELETE /api/upload`
- Accepts `{ url: string }`
- Calls `del(url)` from `@vercel/blob`
- Fire-and-forget cleanup after user downloads

---

## Frontend Changes

### `app/page.tsx`
- Add `blobUrl` and `resultUrl` state vars
- Replace mock `handleUpscale` with real async flow:
  1. `POST /api/upload` → store `blobUrl`
  2. `POST /api/upscale` → store `resultUrl`
  3. `setState('complete')`
  4. `DELETE /api/upload` (fire-and-forget)

### `ProcessingState`
- No changes — animation runs until `onComplete` is called, regardless of duration

### `BeforeAfterSlider`
- `afterUrl` prop changes from `uploadedFile.previewUrl` to real `resultUrl`

### `DownloadButton`
- `fileUrl` changes to `resultUrl`
- After anchor click, fires `DELETE /api/upload` to clean up blob

---

## Error Handling

All failures route to the existing `error` state via `handleError()`:

| Failure | Message |
|---|---|
| Vercel Blob upload fails | `'Upload failed. Please try again.'` |
| Replicate prediction fails | `'Processing failed. Please try again.'` |
| Blob cleanup fails | Silent — fire-and-forget |

---

## Environment Variables

```
BLOB_READ_WRITE_TOKEN   # Vercel Blob — server only
REPLICATE_API_TOKEN     # Replicate — server only
```

Both go in `.env.local`, never exposed to the client.

---

## Out of Scope for Phase 2

- Supabase auth / user accounts
- 4× and 8× upscaling (remain paywall-gated)
- TIFF output
- Job history / dashboard
- Stripe payments
