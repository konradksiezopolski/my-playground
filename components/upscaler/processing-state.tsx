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
