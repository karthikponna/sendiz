import { Link } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthForm } from '@/components/auth/auth-form'

export function SignupPage() {
  return (
    <AuthLayout
      title="Create a Sendiz account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-cf-fg-strong transition-colors hover:text-cf-fg">
            Log in
          </Link>
          .
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthLayout>
  )
}
