import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const storedState = sessionStorage.getItem('oauth_state')

      if (!code || !state) {
        setError('Missing authorization code or state')
        return
      }

      if (state !== storedState) {
        setError('State mismatch - possible CSRF attack')
        return
      }

      try {
        await authApi.callback(code, state)
        sessionStorage.removeItem('oauth_state')

        // Set a flag to indicate we just authenticated
        sessionStorage.setItem('just_authenticated', 'true')

        // Refresh user and wait for the state to update
        await refreshUser()

        // Add a small delay to ensure auth state propagates and prevent race conditions
        await new Promise((resolve) => setTimeout(resolve, 200))

        // Navigate to dashboard and show success message
        toast.success('Successfully authenticated')
        void navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Callback error:', err)
        setError('Failed to complete authentication')
        toast.error('Authentication failed')
      }
    }

    void handleCallback()
  }, [searchParams, navigate, refreshUser])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => {
              void navigate('/login')
            }}
            className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}
