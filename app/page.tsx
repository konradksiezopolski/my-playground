'use client'

import { useState } from 'react'
import type { UpscaleState, Resolution, OutputFormat, UploadedFile } from '@/lib/upscaler-types'
import { Navbar } from '@/components/layout/navbar'

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
      <Navbar />

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

      <p className="p-8 text-zinc-500 text-center">state: {state}</p>
    </main>
  )
}
