import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
}

const plans = [
  { name: 'Starter', price: '$9/mo', upscales: '30 upscales', resolutions: 'Up to 4K' },
  { name: 'Pro', price: '$19/mo', upscales: '100 upscales', resolutions: 'Up to 8K', popular: true },
  { name: 'Unlimited', price: '$39/mo', upscales: 'Unlimited', resolutions: 'All resolutions' },
]

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            4K, 8K Ultra HD, and TIFF output are available on paid plans.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                plan.popular ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{plan.name}</span>
                  {plan.popular && <Badge variant="default" className="text-[10px]">Popular</Badge>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{plan.upscales} · {plan.resolutions}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900">{plan.price}</p>
                <Button size="sm" variant={plan.popular ? 'default' : 'outline'} className="mt-1" onClick={onClose}>
                  Choose
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-zinc-400">Payments via Stripe · Cancel anytime</p>
      </DialogContent>
    </Dialog>
  )
}
