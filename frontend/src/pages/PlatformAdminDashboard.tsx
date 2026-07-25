import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Building2, Users2, Settings, Plus } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  reporting_currency: string
  default_locale: string
  created_at: string
}

export default function PlatformAdminDashboard() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({ name: '', slug: '' })

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get('/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setWorkspaces(response.data.data)
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/workspaces', newWorkspace, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setShowCreateModal(false)
      setNewWorkspace({ name: '', slug: '' })
      fetchWorkspaces()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create workspace')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
              <p className="text-sm text-gray-600">Manage all workspaces</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  window.location.href = '/login'
                }}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Workspaces</p>
                <p className="text-2xl font-bold">{workspaces.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary-100 rounded-lg">
                <Users2 className="w-6 h-6 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workspaces */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Workspaces</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : workspaces.length === 0 ? (
              <p className="text-gray-600">No workspaces found</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Slug</th>
                    <th className="pb-3">Currency</th>
                    <th className="pb-3">Locale</th>
                    <th className="pb-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((workspace) => (
                    <tr key={workspace.id} className="border-b">
                      <td className="py-3 font-medium">{workspace.name}</td>
                      <td className="py-3 text-gray-600">{workspace.slug}</td>
                      <td className="py-3 text-gray-600">{workspace.reporting_currency}</td>
                      <td className="py-3 text-gray-600">{workspace.default_locale}</td>
                      <td className="py-3 text-gray-600">
                        {new Date(workspace.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="label">Workspace Name</label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Slug (URL identifier)</label>
                <input
                  type="text"
                  value={newWorkspace.slug}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, slug: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
