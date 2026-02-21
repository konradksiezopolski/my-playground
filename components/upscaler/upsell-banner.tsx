import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UpsellBannerProps {
  onUpgrade: () => void
}

export function UpsellBanner({ onUpgrade }: UpsellBannerProps) {
  return (
    <Card className="border-zinc-200 bg-zinc-50">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-zinc-800">
            Want 4K or 8K Ultra HD?
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Upgrade to Pro — from $9/month. Unlimited upscales.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">Pro</Badge>
          <Button size="sm" onClick={onUpgrade}>Upgrade</Button>
        </div>
      </CardContent>
    </Card>
  )
}
