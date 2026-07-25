import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string
  roles?: string[]
  workspaceId?: string
  workspaceSlug?: string
  userType?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, workspaceSlug?: string) => Promise<void>
  platformLogin: (email: string, password: string) => Promise<void>
  clientLogin: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
  isEstimator: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = async (email: string, password: string, workspaceSlug: string) => {
    const response = await axios.post('/api/v1/auth/login', {
      email,
      password,
      workspaceSlug
    })
    
    const { token: newToken, user: newUser } = response.data.data
    
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const platformLogin = async (email: string, password: string) => {
    const response = await axios.post('/api/v1/auth/platform-login', {
      email,
      password
    })
    
    const { token: newToken, user: newUser } = response.data.data
    
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const clientLogin = async (email: string, password: string) => {
    const response = await axios.post('/api/v1/auth/client-login', {
      email,
      password
    })
    
    const { token: newToken, user: newUser } = response.data.data
    
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const value = {
    user,
    token,
    login,
    platformLogin,
    clientLogin,
    logout,
    isAuthenticated: !!token,
    isPlatformAdmin: user?.userType === 'platform_admin',
    isTenantAdmin: user?.roles?.includes('tenant_admin'),
    isEstimator: user?.roles?.includes('estimator')
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
