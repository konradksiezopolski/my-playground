import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Resolution } from '@/lib/upscaler-types'

interface ResolutionSelectorProps {
  value: Resolution
  onChange: (value: Resolution) => void
  onProAttempt: () => void
}

const options: { value: Resolution; label: string; desc: string; pro: boolean }[] = [
  { value: '2x', label: '2×', desc: '2K', pro: false },
  { value: '4x', label: '4×', desc: '4K', pro: true },
  { value: '8x', label: '8×', desc: 'Ultra HD', pro: true },
]

export function ResolutionSelector({ value, onChange, onProAttempt }: ResolutionSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700">Resolution</label>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => opt.pro ? onProAttempt() : onChange(opt.value)}
            aria-pressed={value === opt.value && !opt.pro}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-4 text-sm font-medium transition-colors',
              value === opt.value && !opt.pro
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
            )}
          >
            <span className="text-lg font-bold">{opt.label}</span>
            <span className="text-xs opacity-70">{opt.desc}</span>
            {opt.pro && (
              <Badge variant="secondary" className="absolute -top-2 right-2 text-[10px]">
                Pro
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
