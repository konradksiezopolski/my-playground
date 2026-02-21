'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
          <SelectItem value="tiff">
            <span className="flex items-center gap-2">
              TIFF
              <Badge variant="secondary" className="text-[10px]">Pro</Badge>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
