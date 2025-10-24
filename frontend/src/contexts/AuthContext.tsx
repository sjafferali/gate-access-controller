import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react'
import { authApi } from '@/services/api'
import type { User } from '@/types'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  oidcEnabled: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [oidcEnabled, setOidcEnabled] = useState(false)
  const navigate = useNavigate()

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if OIDC is enabled
        const statusResponse = await authApi.getStatus()
        setOidcEnabled(statusResponse.oidc_enabled)

        // Get current user
        await refreshUser()
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [refreshUser])

  const login = async () => {
    try {
      const { authorization_url, state } = await authApi.getLoginUrl()
      // Store state in sessionStorage for verification after callback
      sessionStorage.setItem('oauth_state', state)
      // Redirect to OIDC provider
      window.location.href = authorization_url
    } catch (error) {
      console.error('Failed to initiate login:', error)
      toast.error('Failed to initiate login')
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
      setUser(null)
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      console.error('Failed to logout:', error)
      toast.error('Failed to logout')
    }
  }

  const isAuthenticated = user ? user.is_authenticated : false

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        oidcEnabled,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
