import type { User } from '@supabase/supabase-js'
import { SignInButton } from '@/components/auth/sign-in-button'
import { UserMenu } from '@/components/layout/user-menu'

interface NavbarProps {
  user: User | null
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-zinc-900">
          UpscaleAI
        </span>
        {user ? <UserMenu user={user} /> : <SignInButton />}
      </div>
    </header>
  )
}
