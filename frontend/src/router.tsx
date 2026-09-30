import { createBrowserRouter, Navigate } from 'react-router'
import { RedirectIfSignedIn, RequireAuth } from '@/components/require-auth'
import { RootLayout } from '@/components/root-layout'
import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/login'
import { DashboardLayout } from '@/pages/dashboard/layout'
import { OnboardingPage } from '@/pages/dashboard/onboarding'
import { EmailsPage } from '@/pages/dashboard/emails'
import { ApiKeysPage } from '@/pages/dashboard/api-keys'
import { UsagePage } from '@/pages/dashboard/usage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: <RedirectIfSignedIn />,
        children: [
          { path: '/login', element: <LoginPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/dashboard', element: <OnboardingPage /> },
              { path: '/emails', element: <EmailsPage /> },
              { path: '/api-keys', element: <ApiKeysPage /> },
              { path: '/usage', element: <UsagePage /> },
            ],
          },
        ],
      },
      { path: '/onboarding', element: <Navigate to="/dashboard" replace /> },
      { path: '/signup', element: <Navigate to="/login" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
