import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Filter } from 'lucide-react'

interface Project {
  id: string
  title: string
  client_name: string
  status: string
  quoted_total_minor: number
  actual_total_minor: number
  created_at: string
}

export default function Projects() {
  const { token } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', clientId: '', status: 'planning' })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProjects(response.data.data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/projects', newProject, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreateModal(false)
      setNewProject({ title: '', clientId: '', status: 'planning' })
      fetchProjects()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create project')
    }
  }

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'planning': return 'bg-gray-100 text-gray-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Track your projects and costs</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Projects Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 px-6">Project #</th>
                <th className="pb-3 px-6">Title</th>
                <th className="pb-3 px-6">Client</th>
                <th className="pb-3 px-6">Status</th>
                <th className="pb-3 px-6">Quoted Value</th>
                <th className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">Loading...</td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">No projects found</td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium">PRJ-{project.id.slice(0, 8)}</td>
                    <td className="py-4 px-6">{project.title}</td>
                    <td className="py-4 px-6">{project.client_name}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      KES {(project.quoted_total_minor / 100).toFixed(0)}
                    </td>
                    <td className="py-4 px-6">
                      <button className="text-primary-600 hover:text-primary-800 mr-2">View</button>
                      <button className="text-gray-600 hover:text-gray-800">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="label">Project Title</label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Client ID</label>
                <input
                  type="text"
                  value={newProject.clientId}
                  onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
                  className="input"
                  placeholder="Client UUID"
                  required
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="input"
                  required
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
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
