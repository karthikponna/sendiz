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

function isEmailNotVerified(error: { code?: string; message?: string; status?: number }) {
  return (
    error.code === 'email_not_confirmed' ||
    error.code === 'EMAIL_NOT_VERIFIED' ||
    (error.status === 403 && /verif/i.test(error.message ?? ''))
  )
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState<'email' | 'google' | 'verify' | 'resend' | null>(null)
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [code, setCode] = useState('')

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= MIN_PASSWORD

  async function finishSignIn() {
    await qc.invalidateQueries({ queryKey: sessionKey })
    navigate('/dashboard', { replace: true })
  }

  // Neon Auth is set to require verification but not to send the code on its own, so the
  // app asks for one whenever it moves to the verify step.
  async function sendCode() {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
    if (error) toast.error(error.message ?? 'Could not send the verification code')
    else toast.success(`We sent a code to ${email}`)
  }

  async function startVerification() {
    setStep('verify')
    setCode('')
    setPending('resend')
    await sendCode()
    setPending(null)
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setPending('verify')
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp: code })
    if (error) {
      toast.error(error.message ?? 'That code is invalid or expired')
      setPending(null)
      return
    }
    // Verification usually signs the user in; sign in explicitly if it didn't.
    const { data } = await authClient.getSession()
    if (!data?.user) {
      const signIn = await authClient.signIn.email({ email, password })
      if (signIn.error) {
        toast.error(signIn.error.message ?? 'Email verified, please log in')
        setPending(null)
        return
      }
    }
    await finishSignIn()
  }

  async function onGoogle() {
    setPending('google')
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
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

    if (mode === 'signup') {
      const { data, error } = await authClient.signUp.email({ email, password, name: email.split('@')[0] })
      if (error) {
        toast.error(error.message ?? 'Something went wrong')
        setPending(null)
        return
      }
      if (data?.user && !data.user.emailVerified) {
        await startVerification()
        return
      }
      await finishSignIn()
      return
    }

    const { error } = await authClient.signIn.email({ email, password })
    if (error) {
      if (isEmailNotVerified(error)) {
        await startVerification()
        return
      }
      toast.error(error.message ?? 'Something went wrong')
      setPending(null)
      return
    }
    await finishSignIn()
  }

  if (step === 'verify') {
    return (
      <form onSubmit={onVerify} noValidate>
        <p className="mb-6 text-center text-sm text-cf-fg-muted">
          Enter the code we sent to <span className="text-cf-fg-strong">{email}</span>. It expires in 15 minutes.
        </p>
        <div className="mb-5 flex flex-col gap-2">
          <label htmlFor="code" className="text-sm text-cf-fg-strong">
            Verification code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={cn(glassInput, 'text-center font-mono text-xl tracking-[0.4em]')}
          />
        </div>
        <button
          type="submit"
          disabled={code.length < 4 || pending !== null}
          className={cn(glassButton, 'mx-auto mt-1 h-10 w-40 gap-2 rounded-xl px-4 text-sm')}
        >
          {pending === 'verify' && <Loader2 className="size-4 animate-spin" />}
          Verify email
        </button>
        <div className="mt-5 flex items-center justify-between text-sm text-cf-fg-muted">
          <button
            type="button"
            onClick={() => setStep('form')}
            className="transition-colors hover:text-cf-fg-strong"
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={startVerification}
            disabled={pending !== null}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-cf-fg-strong disabled:opacity-50"
          >
            {pending === 'resend' && <Loader2 className="size-3.5 animate-spin" />}
            Resend code
          </button>
        </div>
      </form>
    )
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
    </>
  )
}
