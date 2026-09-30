import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthForm } from '@/components/auth/auth-form'

export function LoginPage() {
  return (
    <AuthLayout title="Log in to Sendiz" subtitle="New here? Your account is created the first time you sign in.">
      <AuthForm />
    </AuthLayout>
  )
}
