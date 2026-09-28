import { createBrowserRouter, Navigate } from 'react-router'
import { RedirectIfSignedIn, RequireAuth } from '@/components/require-auth'
import { RootLayout } from '@/components/root-layout'
import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/login'
import { SignupPage } from '@/pages/signup'
import { DashboardLayout } from '@/pages/dashboard/layout'
import { OnboardingPage } from '@/pages/dashboard/onboarding'
import { EmailsPage } from '@/pages/dashboard/emails'
import { ApiKeysPage } from '@/pages/dashboard/api-keys'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: <RedirectIfSignedIn />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/onboarding', element: <OnboardingPage /> },
              { path: '/emails', element: <EmailsPage /> },
              { path: '/api-keys', element: <ApiKeysPage /> },
            ],
          },
        ],
      },
      { path: '/dashboard', element: <Navigate to="/onboarding" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
