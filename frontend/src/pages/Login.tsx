import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loginSchema } from '../lib/validation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = loginSchema.safeParse({ email, password })
      if (!result.success) {
        setError(result.error.issues[0].message)
        setLoading(false)
        return
      }

      const user = await login(email, password)

      // Route based on the user type returned by the backend
      if (user.userType === 'platform_admin') {
        navigate('/platform-admin')
      } else if (user.userType === 'client_user') {
        navigate('/client-portal')
      } else {
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="label">Password</label>
            <input
              id="login-password"
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
            aria-busy={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-800">
            Forgot password?
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium mb-2">Demo Credentials:</p>
          <p className="text-xs">admin@qms.platform / Admin@123</p>
          <p className="text-xs">admin@joscards.example / Tenant@123</p>
          <p className="text-xs">sarah@acme.example / Client@123</p>
        </div>
      </div>
    </div>
  )
}
