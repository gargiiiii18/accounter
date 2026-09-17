'use client'

import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

// Sign-in / sign-up actions when signed out, user button when signed in.
export function AuthControls() {
  return (
    <div className="flex items-center gap-3">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="default">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="default">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  )
}
