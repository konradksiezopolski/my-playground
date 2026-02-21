'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SignInModal } from './sign-in-modal'

export function SignInButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Sign In
      </Button>
      <SignInModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
