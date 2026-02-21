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
