import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiActivity, FiLock, FiLogIn } from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { isAuthenticated, oidcEnabled, isLoading, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      // Clear any authentication flags
      sessionStorage.removeItem('just_authenticated')
      void navigate('/dashboard', { replace: true })
    }
    // If OIDC is not enabled, redirect to dashboard (no auth required)
    if (!isLoading && !oidcEnabled) {
      void navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, oidcEnabled, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-600">
            <FiActivity className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Gate Access Controller</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your access links</p>
        </div>

        {/* Login Form */}
        <div className="mt-8 space-y-6">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiLock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Authentication Required</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This application requires authentication via OpenID Connect. Click the button
                    below to sign in with your identity provider.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => void login()}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FiLogIn className="h-5 w-5 text-primary-300 group-hover:text-primary-200" />
            </span>
            Sign in with OIDC
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            You will be redirected to your identity provider to complete sign in
          </p>
        </div>
      </div>
    </div>
  )
}
