# UpscaleAI — Phase 1 Design Doc

**Date:** 2026-02-21
**Phase:** 1 — Foundation (UI-first, mock integrations)
**Status:** Approved

---

## Overview

A single-page AI image upscaler. Users upload an image, select a resolution and format, watch a processing animation, then see a before/after comparison and download the result. Phase 1 uses mock processing (no real API) to validate the full UX loop.

---

## Approach

- **Single-page app** — all functionality on `app/page.tsx`, no routing needed for Phase 1
- **UI-first** — mock 3s processing delay, return same image as "upscaled" result
- **Light & clean aesthetic** — white/neutral background, shadcn components, Tailwind
- **App name:** UpscaleAI

---

## Page Layout

```
┌─────────────────────────────────────┐
│  NAV  UpscaleAI          [Sign In]  │
├─────────────────────────────────────┤
│  HERO  "Upscale your images with AI"│
│        subtitle + trust badges      │
├─────────────────────────────────────┤
│  TOOL  [Drag & drop upload zone]    │
│        Resolution selector 2x/4x/8x │
│        Format selector              │
│        [Upscale button]             │
│        → Processing state           │
│        → Before/after slider        │
│        → Download button            │
│        → Upsell nudge               │
└─────────────────────────────────────┘
```

---

## Components

| Component | shadcn base | Description |
|---|---|---|
| `<Navbar>` | — | Logo + Sign In button |
| `<UploadZone>` | — | Drag & drop, file picker, JPG/PNG/WEBP, 10MB limit |
| `<ResolutionSelector>` | `ToggleGroup` | 2x / 4x / 8x — 4x/8x show "Pro" badge, trigger paywall |
| `<FormatSelector>` | `Select` | JPG / PNG / WEBP / TIFF — TIFF locked, triggers paywall |
| `<ProcessingState>` | `Progress` + `Skeleton` | Animated progress bar + estimated time text |
| `<BeforeAfterSlider>` | — | Custom drag-handle overlay, "Original" / "Upscaled" labels with px dimensions |
| `<DownloadButton>` | `Button` | Prominent CTA, triggers browser download |
| `<PaywallModal>` | `Dialog` | Triggered by 4x/8x/TIFF selection — prompts sign up/upgrade |
| `<UpsellBanner>` | `Card` | Shown below download for guest users |

---

## State Machine

```
idle → uploading → ready → processing → complete
                                ↓
                             error
```

- **idle:** Upload zone visible, full width
- **uploading:** File being read into memory, brief spinner
- **ready:** File accepted, resolution/format selectors appear, Upscale button active
- **processing:** Mock 3s delay, progress bar animates, estimated time shown
- **complete:** Before/after slider visible, download button prominent
- **error:** Inline error message, retry button

---

## Mock Behaviour

- Upload accepts JPG, PNG, WEBP up to 10MB
- `createObjectURL()` used to display the uploaded image
- On "Upscale" click: 3s fake delay with animated progress
- "Upscaled" result = same image (placeholder until Replicate is wired in)
- Download uses anchor tag with `download` attribute
- 4x / 8x / TIFF selections trigger `<PaywallModal>` immediately

---

## File Structure

```
app/
  page.tsx                  ← main page, state machine
  globals.css
components/
  upscaler/
    upload-zone.tsx
    resolution-selector.tsx
    format-selector.tsx
    processing-state.tsx
    before-after-slider.tsx
    download-button.tsx
    paywall-modal.tsx
    upsell-banner.tsx
  layout/
    navbar.tsx
  ui/                       ← shadcn components (already installed)
```

---

## Out of Scope for Phase 1

- Real Replicate API integration
- Supabase (auth, storage, DB)
- Stripe payments
- User accounts / dashboard
- 4x / 8x actual processing
- TIFF output
- Mobile polish
