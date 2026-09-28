import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { LogoMark } from '@/components/logo'
import { useSession } from '@/hooks/use-session'

const VERIFIER_PARAM = 'neon_auth_session_verifier'

// After Google sign-in, Neon Auth redirects back to the site root with
// ?neon_auth_session_verifier=… instead of the callbackURL path. getSession() exchanges
// the verifier for a session, so wait for it here and then send the user to the dashboard.
export function RootLayout() {
  const [finishingOAuth, setFinishingOAuth] = useState(() =>
    new URLSearchParams(window.location.search).has(VERIFIER_PARAM),
  )
  if (finishingOAuth) return <OAuthCallback onDone={() => setFinishingOAuth(false)} />
  return <Outlet />
}

function OAuthCallback({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()
  const handled = useRef(false)

  useEffect(() => {
    if (isPending || handled.current) return
    handled.current = true
    if (!session) toast.error('Google sign-in failed, please try again')
    navigate(session ? '/onboarding' : '/login', { replace: true })
    onDone()
  }, [isPending, session, navigate, onDone])

  return (
    <div className="grid min-h-dvh place-items-center">
      <LogoMark className="size-9 animate-pulse" />
    </div>
  )
}
