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
      <p className="p-8 text-zinc-500">state: {state}</p>
    </main>
  )
}
