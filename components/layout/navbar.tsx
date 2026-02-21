import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <header className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-zinc-900">
          UpscaleAI
        </span>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </div>
    </header>
  )
}
