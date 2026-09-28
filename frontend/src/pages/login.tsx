import { Link } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthForm } from '@/components/auth/auth-form'

export function LoginPage() {
  return (
    <AuthLayout
      title="Log in to Sendiz"
      subtitle={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-cf-fg-strong transition-colors hover:text-cf-fg">
            Sign up
          </Link>
          .
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthLayout>
  )
}
