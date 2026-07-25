import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { platformLoginSchema, tenantLoginSchema, clientLoginSchema } from '../lib/validation'

export default function Login() {
  const [loginType, setLoginType] = useState<'tenant' | 'platform' | 'client'>('tenant')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login, platformLogin, clientLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate input based on login type
      if (loginType === 'platform') {
        const result = platformLoginSchema.safeParse({ email, password })
        if (!result.success) {
          setError(result.error.errors[0].message)
          setLoading(false)
          return
        }
        await platformLogin(email, password)
        navigate('/platform-admin')
      } else if (loginType === 'client') {
        const result = clientLoginSchema.safeParse({ email, password })
        if (!result.success) {
          setError(result.error.errors[0].message)
          setLoading(false)
          return
        }
        await clientLogin(email, password)
        navigate('/client-portal')
      } else {
        const result = tenantLoginSchema.safeParse({ email, password, workspaceSlug })
        if (!result.success) {
          setError(result.error.errors[0].message)
          setLoading(false)
          return
        }
        await login(email, password, workspaceSlug)
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">QMS</h1>
          <p className="text-gray-600 mt-2">Quotation Management System</p>
        </div>

        {/* Login type selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLoginType('tenant')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              loginType === 'tenant' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tenant
          </button>
          <button
            onClick={() => setLoginType('platform')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              loginType === 'platform' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Platform Admin
          </button>
          <button
            onClick={() => setLoginType('client')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              loginType === 'client' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Client Portal
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginType === 'tenant' && (
            <div>
              <label className="label">Workspace Slug</label>
              <input
                type="text"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                className="input"
                placeholder="e.g., joscards"
                required
              />
            </div>
          )}
          
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium mb-2">Demo Credentials:</p>
          {loginType === 'tenant' && (
            <p className="text-xs">admin@joscards.example / Tenant@123 (workspace: joscards)</p>
          )}
          {loginType === 'platform' && (
            <p className="text-xs">admin@qms.platform / Admin@123</p>
          )}
          {loginType === 'client' && (
            <p className="text-xs">sarah@acme.example / Client@123</p>
          )}
        </div>
      </div>
    </div>
  )
}
