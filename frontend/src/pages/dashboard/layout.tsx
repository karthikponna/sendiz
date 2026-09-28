import { NavLink, Outlet, useNavigate } from 'react-router'
import { ChevronsUpDown, ExternalLink, KeyRound, LogOut, Mail, Rocket } from 'lucide-react'
import { Logo } from '@/components/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession, useSignOut } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/onboarding', label: 'Get started', icon: Rocket },
  { to: '/emails', label: 'Emails', icon: Mail },
  { to: '/api-keys', label: 'API keys', icon: KeyRound },
]

const MAILPIT_URL = 'http://localhost:8025'

export function DashboardLayout() {
  const { data: session } = useSession()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const user = session?.user
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  async function onSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh bg-cf-bg">
      <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-cf-border px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent">
            {user?.image ? (
              <img src={user.image} alt="" className="size-7 rounded-md" />
            ) : (
              <span className="grid size-7 place-items-center rounded-md bg-cf-accent text-sm font-semibold text-cf-fg-strong">
                {initial}
              </span>
            )}
            <span className="flex-1 truncate text-sm font-medium text-cf-fg-strong">{user?.name || user?.email}</span>
            <ChevronsUpDown className="size-4 text-cf-fg-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-cf-fg-muted">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="mt-6 flex flex-col gap-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-cf-fg-strong'
                    : 'text-cf-fg-muted hover:bg-accent/60 hover:text-cf-fg-strong',
                )
              }
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-2">
          <a
            href={MAILPIT_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-cf-fg-muted transition-colors hover:text-cf-fg-strong"
          >
            <ExternalLink className="size-3.5" /> Mailpit inbox
          </a>
          <NavLink to="/" className="opacity-80 transition-opacity hover:opacity-100">
            <Logo className="[&_span]:text-sm" />
          </NavLink>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-10 py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
