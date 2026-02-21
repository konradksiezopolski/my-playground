'use client'

import { useState } from 'react'
import type { UpscaleState, Resolution, OutputFormat, UploadedFile } from '@/lib/upscaler-types'
import { Navbar } from '@/components/layout/navbar'
import { UploadZone } from '@/components/upscaler/upload-zone'
import { ResolutionSelector } from '@/components/upscaler/resolution-selector'
import { FormatSelector } from '@/components/upscaler/format-selector'
import { ProcessingState } from '@/components/upscaler/processing-state'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [state, setState] = useState<UpscaleState>('idle')
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [resolution, setResolution] = useState<Resolution>('2x')
  const [format, setFormat] = useState<OutputFormat>('jpg')
  const [progress, setProgress] = useState(0)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = (file: UploadedFile) => {
    setUploadedFile(file)
    setState('ready')
    setError(null)
  }

  const handleError = (message: string) => {
    setError(message)
    setState('error')
  }

  const handleUpscale = () => {
    setState('processing')
  }

  const handleProcessingComplete = () => {
    setState('complete')
  }

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

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <p className="mb-4 text-center text-sm text-zinc-400">state: {state}</p>

        {state === 'idle' || state === 'error' ? (
          <div className="space-y-3">
            <UploadZone onUpload={handleUpload} onError={handleError} />
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
          </div>
        ) : null}

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

        {state === 'processing' && (
          <ProcessingState onComplete={handleProcessingComplete} />
        )}
      </section>
    </main>
  )
}
