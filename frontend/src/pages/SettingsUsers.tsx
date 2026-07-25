import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Shield, Mail, Clock } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  roles: string[]
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export default function SettingsUsers() {
  const { token, isTenantAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', roles: ['staff_viewer'] as string[] })

  useEffect(() => {
    if (isTenantAdmin) {
      fetchUsers()
    }
  }, [isTenantAdmin])

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/users', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowInviteModal(false)
      setNewUser({ email: '', name: '', roles: ['staff_viewer'] })
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to invite user')
    }
  }

  const toggleRole = (role: string) => {
    setNewUser(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tenant_admin': return 'bg-purple-100 text-purple-800'
      case 'estimator': return 'bg-blue-100 text-blue-800'
      case 'procurement': return 'bg-green-100 text-green-800'
      case 'project_manager': return 'bg-yellow-100 text-yellow-800'
      case 'staff_viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isTenantAdmin) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only tenant administrators can manage users.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings - Users</h1>
          <p className="text-gray-600">Manage workspace users and roles</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Role Definitions */}
      <div className="card mb-6 p-6">
        <h2 className="text-lg font-semibold mb-4">Role Definitions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-1">Tenant Admin</h3>
            <p className="text-sm text-purple-700">Full workspace access including user management</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-1">Estimator</h3>
            <p className="text-sm text-blue-700">Create and edit quotes, view projects</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-1">Procurement</h3>
            <p className="text-sm text-green-700">Manage suppliers, products, and offers</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-900 mb-1">Project Manager</h3>
            <p className="text-sm text-yellow-700">Manage projects, track milestones, cost events</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-1">Staff Viewer</h3>
            <p className="text-sm text-gray-700">Read-only access to quotes and projects</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search users..." className="input pl-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 px-6">Name</th>
                <th className="pb-3 px-6">Email</th>
                <th className="pb-3 px-6">Roles</th>
                <th className="pb-3 px-6">Last Login</th>
                <th className="pb-3 px-6">Status</th>
                <th className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium">{user.name}</td>
                    <td className="py-4 px-6 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {user.email}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <span key={role} className={`px-2 py-1 rounded text-xs ${getRoleColor(role)}`}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button className="text-primary-600 hover:text-primary-800 mr-2">Edit</button>
                      <button className="text-gray-600 hover:text-gray-800">Reset Password</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Roles</label>
                <div className="space-y-2">
                  {['tenant_admin', 'estimator', 'procurement', 'project_manager', 'staff_viewer'].map((role) => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="w-4 h-4"
                      />
                      <span className="capitalize">{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
