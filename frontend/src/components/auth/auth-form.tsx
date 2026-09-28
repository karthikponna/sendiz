import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth'
import { sessionKey } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const MIN_PASSWORD = 8

const glassButton =
  'glass inline-flex h-12 items-center justify-center gap-3 rounded-2xl px-5 font-semibold text-cf-fg-strong transition hover:border-cf-fg/15 disabled:cursor-not-allowed disabled:text-cf-fg-strong/50'
const glassInput =
  'glass h-12 w-full rounded-2xl px-4 text-base text-cf-fg-strong outline-none transition placeholder:text-cf-fg/40 focus:border-cf-fg/25'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState<'email' | 'google' | null>(null)

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= MIN_PASSWORD

  async function onGoogle() {
    setPending('google')
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/onboarding`,
    })
    if (error) {
      toast.error(error.message ?? 'Google sign-in failed')
      setPending(null)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setPending('email')
    const { error } =
      mode === 'signup'
        ? await authClient.signUp.email({ email, password, name: email.split('@')[0] })
        : await authClient.signIn.email({ email, password })
    if (error) {
      toast.error(error.message ?? 'Something went wrong')
      setPending(null)
      return
    }
    await qc.invalidateQueries({ queryKey: sessionKey })
    navigate('/onboarding', { replace: true })
  }

  return (
    <>
      <button type="button" onClick={onGoogle} disabled={pending !== null} className={cn(glassButton, 'w-full')}>
        {pending === 'google' ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon />}
        Log in with Google
      </button>

      <div className="my-6 flex items-center gap-4 text-sm text-cf-fg-muted">
        <span className="h-px flex-1 bg-cf-border" /> or <span className="h-px flex-1 bg-cf-border" />
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-5 flex flex-col gap-2">
          <label htmlFor="email" className="text-sm text-cf-fg-strong">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="alan.turing@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={glassInput}
          />
        </div>

        <div className="mb-5 flex flex-col gap-2">
          <label htmlFor="password" className="text-sm text-cf-fg-strong">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(glassInput, 'pr-11')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cf-fg-muted transition-colors hover:text-cf-fg-strong"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {mode === 'signup' && (
            <p className={cn('text-xs', password.length >= MIN_PASSWORD ? 'text-emerald-400' : 'text-cf-fg-muted')}>
              At least {MIN_PASSWORD} characters
            </p>
          )}
        </div>

        <button type="submit" disabled={!valid || pending !== null} className={cn(glassButton, 'mt-1 w-full text-sm')}>
          {pending === 'email' && <Loader2 className="size-4 animate-spin" />}
          {mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-cf-fg-muted">
        By {mode === 'signup' ? 'signing up' : 'signing in'}, you agree to our{' '}
        <a href="#" className="underline underline-offset-2 hover:text-cf-fg">Terms</a> and{' '}
        <a href="#" className="underline underline-offset-2 hover:text-cf-fg">Privacy Policy</a>.
      </p>
    </>
  )
}
