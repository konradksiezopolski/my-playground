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
