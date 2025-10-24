import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'

export default function ProtectedLayout() {
  const { isAuthenticated, oidcEnabled, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // If OIDC is enabled and user is not authenticated, redirect to login
    if (!isLoading && oidcEnabled && !isAuthenticated) {
      void navigate('/login')
    }
  }, [isAuthenticated, oidcEnabled, isLoading, navigate])

  // Show loading state while checking authentication
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

  // If OIDC is enabled but user is not authenticated, don't render anything
  // (the useEffect will redirect to login)
  if (oidcEnabled && !isAuthenticated) {
    return null
  }

  // Otherwise, render the layout
  return <Layout />
}
