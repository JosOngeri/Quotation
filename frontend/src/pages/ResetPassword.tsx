import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/axios'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      setMessage('Password reset successfully. Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid link</h1>
          <p className="text-gray-600 mb-4">This password reset link is missing a token.</p>
          <Link to="/forgot-password" className="btn btn-primary">Request new link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">QMS</h1>
          <p className="text-gray-600 mt-2">Reset your password</p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="label">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="label">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
