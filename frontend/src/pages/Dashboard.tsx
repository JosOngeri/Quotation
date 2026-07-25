import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { FileText, FolderKanban, AlertCircle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const { user, token } = useAuth()
  const [stats, setStats] = useState({
    activeQuotes: 0,
    activeProjects: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0
  })
  const [recentQuotes, setRecentQuotes] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch quotes and projects in parallel
      const [quotesResponse, projectsResponse] = await Promise.all([
        axios.get('/api/v1/quotes', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/v1/projects', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const quotes = quotesResponse.data.data
      const projects = projectsResponse.data.data

      // Calculate stats
      const activeQuotes = quotes.filter((q: any) => q.status === 'draft' || q.status === 'published').length
      const activeProjects = projects.filter((p: any) => p.status === 'active').length
      const pendingApprovals = quotes.filter((q: any) => q.status === 'published').length

      setStats({
        activeQuotes,
        activeProjects,
        pendingApprovals,
        monthlyRevenue: projects.reduce((sum: number, p: any) => sum + (p.quoted_total_minor || 0), 0)
      })

      // Set recent items (last 3)
      setRecentQuotes(quotes.slice(0, 3))
      setRecentProjects(projects.slice(0, 3))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 text-sm lg:text-base">Welcome back, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <div className="card p-4 lg:p-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-2 lg:p-3 bg-primary-100 rounded-lg">
              <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-600">Active Quotes</p>
              <p className="text-lg lg:text-2xl font-bold">{stats.activeQuotes}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 lg:p-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-2 lg:p-3 bg-secondary-100 rounded-lg">
              <FolderKanban className="w-5 h-5 lg:w-6 lg:h-6 text-secondary-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-600">Active Projects</p>
              <p className="text-lg lg:text-2xl font-bold">{stats.activeProjects}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 lg:p-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-2 lg:p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-600">Pending</p>
              <p className="text-lg lg:text-2xl font-bold">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 lg:p-6 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-2 lg:p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-gray-600">Revenue</p>
              <p className="text-lg lg:text-2xl font-bold">KES {(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="card">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <h2 className="text-base lg:text-lg font-semibold">Recent Quotes</h2>
          </div>
          <div className="p-4 lg:p-6">
            {loading ? (
              <p className="text-gray-600 text-sm">Loading...</p>
            ) : recentQuotes.length === 0 ? (
              <p className="text-gray-600 text-sm">No quotes found</p>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm lg:text-base truncate">QT-{quote.id.slice(0, 8)}</p>
                      <p className="text-xs lg:text-sm text-gray-600 truncate">{quote.title}</p>
                    </div>
                    <span className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm ml-2 flex-shrink-0 ${
                      quote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      quote.status === 'published' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <h2 className="text-base lg:text-lg font-semibold">Recent Projects</h2>
          </div>
          <div className="p-4 lg:p-6">
            {loading ? (
              <p className="text-gray-600 text-sm">Loading...</p>
            ) : recentProjects.length === 0 ? (
              <p className="text-gray-600 text-sm">No projects found</p>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm lg:text-base truncate">PRJ-{project.id.slice(0, 8)}</p>
                      <p className="text-xs lg:text-sm text-gray-600 truncate">{project.title}</p>
                    </div>
                    <span className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm ml-2 flex-shrink-0 ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'planning' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
