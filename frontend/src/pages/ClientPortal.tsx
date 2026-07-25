import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { FileText, FolderKanban, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Quote {
  id: string
  title: string
  status: string
  currency: string
  valid_until: string
  created_at: string
}

interface Project {
  id: string
  title: string
  status: string
  quoted_total_minor: number
  actual_total_minor: number
  start_date: string
  target_end_date: string
}

export default function ClientPortal() {
  const { user, token } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'quotes' | 'projects'>('quotes')

  useEffect(() => {
    fetchClientData()
  }, [])

  const fetchClientData = async () => {
    try {
      // For now, we'll use the same endpoints since client-specific endpoints aren't implemented yet
      const [quotesResponse, projectsResponse] = await Promise.all([
        axios.get('/api/v1/quotes', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/v1/projects', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      setQuotes(quotesResponse.data.data)
      setProjects(projectsResponse.data.data)
    } catch (error) {
      console.error('Failed to fetch client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'published': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'planning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
            </div>
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
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Quotes</p>
                <p className="text-2xl font-bold">{quotes.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary-100 rounded-lg">
                <FolderKanban className="w-6 h-6 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Projects</p>
                <p className="text-2xl font-bold">{projects.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'quotes'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Quotes
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Projects
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'quotes' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Your Quotes</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : quotes.length === 0 ? (
                <p className="text-gray-600">No quotes found</p>
              ) : (
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                        </div>
                        <div>
                          <p className="font-medium">QT-{quote.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">{quote.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Valid until: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                        </p>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(quote.status)}`}>
                          {quote.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Your Projects</h2>
            </div>
            <div className="p-6">
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : projects.length === 0 ? (
                <p className="text-gray-600">No projects found</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                        </div>
                        <div>
                          <p className="font-medium">PRJ-{project.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">{project.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'} - {project.target_end_date ? new Date(project.target_end_date).toLocaleDateString() : '-'}
                        </p>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}