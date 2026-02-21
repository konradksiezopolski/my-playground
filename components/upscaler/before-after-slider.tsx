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
  const onTouchStart = (e: React.TouchEvent) => updatePosition(e.touches[0].clientX)
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
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {/* After (full width underneath) */}
        <img src={afterUrl} alt="Upscaled" className="absolute inset-0 w-full h-full object-cover" />

        {/* Before (clipped to left portion) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img src={beforeUrl} alt="Original" className="absolute inset-0 h-full object-cover" style={{ width: '100%' }} />
        </div>

        {/* Divider */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${position}%` }}>
          <div
            role="slider"
            aria-valuenow={Math.round(position)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Before/after comparison slider"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg"
          >
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
