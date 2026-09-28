import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/hooks/use-session'
import { LogoMark } from '@/components/logo'

export function RequireAuth() {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LogoMark className="size-9 animate-pulse" />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

// Signed-in users skip the auth pages.
export function RedirectIfSignedIn() {
  const { data: session, isPending } = useSession()
  if (isPending) return null
  if (session) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
