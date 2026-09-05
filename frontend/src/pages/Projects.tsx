import { useState, useEffect, useCallback } from 'react'
import api from '../lib/axios'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Filter, ChevronDown, ChevronUp, Check } from 'lucide-react'
import Pagination from '../components/Pagination'

interface Project {
  id: string
  title: string
  client_name: string
  status: string
  quoted_total_minor: number
  actual_total_minor: number
  created_at: string
}

interface Supplier {
  id: string
  name: string
}

interface CostEvent {
  id: string
  event_type: string
  description: string
  quantity: number
  unit: string
  unit_cost_minor: number
  total_minor: number
  supplier_id: string | null
  supplier_name: string | null
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

interface CostSummary {
  quoted_total_minor: number
  actual_total_minor: number
  variance_minor: number
}

export default function Projects() {
  const { isTenantAdmin, user } = useAuth()
  const isProjectManager = user?.roles?.includes('project_manager')
  const canApprove = isTenantAdmin || isProjectManager
  const [projects, setProjects] = useState<Project[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', clientId: '', status: 'planning' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [costEvents, setCostEvents] = useState<Record<string, CostEvent[]>>({})
  const [costSummary, setCostSummary] = useState<Record<string, CostSummary>>({})
  const [newEvent, setNewEvent] = useState<Record<string, { eventType: string; description: string; quantity: number; unit: string; unitCostMinor: number; supplierId: string }>>({})

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page: pagination.page, pageSize: pagination.pageSize, search }
      if (statusFilter) params.status = statusFilter

      const response = await api.get('/projects', { params })
      setProjects(response.data.data)
      setPagination({
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      })
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, pagination.page, pagination.pageSize])

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { pageSize: 1000 } })
      setSuppliers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchSuppliers()
  }, [fetchProjects])

  const toggleCostEvents = async (projectId: string) => {
    if (expanded === projectId) {
      setExpanded(null)
      return
    }
    setExpanded(projectId)
    try {
      const [eventsRes, summaryRes] = await Promise.all([
        api.get(`/projects/${projectId}/cost-events`),
        api.get(`/projects/${projectId}/cost-summary`)
      ])
      setCostEvents((prev) => ({ ...prev, [projectId]: eventsRes.data.data || [] }))
      setCostSummary((prev) => ({ ...prev, [projectId]: summaryRes.data.data }))
      setNewEvent((prev) => ({ ...prev, [projectId]: { eventType: 'actual', description: '', quantity: 1, unit: '', unitCostMinor: 0, supplierId: '' } }))
    } catch (error) {
      console.error('Failed to fetch cost events:', error)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/projects', newProject)
      setShowCreateModal(false)
      setNewProject({ title: '', clientId: '', status: 'planning' })
      fetchProjects()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create project')
    }
  }

  const handleCreateCostEvent = async (projectId: string) => {
    const event = newEvent[projectId]
    if (!event) return
    try {
      await api.post(`/projects/${projectId}/cost-events`, event)
      const [eventsRes, summaryRes] = await Promise.all([
        api.get(`/projects/${projectId}/cost-events`),
        api.get(`/projects/${projectId}/cost-summary`)
      ])
      setCostEvents((prev) => ({ ...prev, [projectId]: eventsRes.data.data || [] }))
      setCostSummary((prev) => ({ ...prev, [projectId]: summaryRes.data.data }))
      setNewEvent((prev) => ({ ...prev, [projectId]: { eventType: 'actual', description: '', quantity: 1, unit: '', unitCostMinor: 0, supplierId: '' } }))
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create cost event')
    }
  }

  const handleApprove = async (projectId: string, eventId: string) => {
    try {
      await api.post(`/projects/${projectId}/cost-events/${eventId}/approve`)
      const eventsRes = await api.get(`/projects/${projectId}/cost-events`)
      const summaryRes = await api.get(`/projects/${projectId}/cost-summary`)
      setCostEvents((prev) => ({ ...prev, [projectId]: eventsRes.data.data || [] }))
      setCostSummary((prev) => ({ ...prev, [projectId]: summaryRes.data.data }))
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to approve')
    }
  }

  const formatMinor = (minor: number) => (minor / 100).toFixed(2)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'planning': return 'bg-gray-100 text-gray-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePageChange = (page: number) => setPagination((p) => ({ ...p, page }))
  const handlePageSizeChange = (pageSize: number) => setPagination((p) => ({ ...p, page: 1, pageSize }))

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 text-sm lg:text-base">Track your projects and costs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full lg:w-auto justify-center"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 lg:mb-6 p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id="project-search"
            type="text"
            placeholder="Search projects..."
            className="input pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />
        </div>
        <div className="w-full lg:w-48">
          <label htmlFor="project-status" className="sr-only">Filter by status</label>
          <select
            id="project-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button className="btn btn-secondary flex items-center gap-2 w-full lg:w-auto justify-center" aria-label="Filter projects">
          <Filter className="w-4 h-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Projects Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th scope="col" className="pb-3 px-6">Project #</th>
                <th scope="col" className="pb-3 px-6">Title</th>
                <th scope="col" className="pb-3 px-6">Client</th>
                <th scope="col" className="pb-3 px-6">Status</th>
                <th scope="col" className="pb-3 px-6">Quoted Value</th>
                <th scope="col" className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600" aria-busy="true">Loading...</td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">No projects found</td>
                </tr>
              ) : (
                projects.map((project) => (
                  <>
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
                        KES {formatMinor(project.quoted_total_minor)}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleCostEvents(project.id)}
                          className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
                          aria-label={`${expanded === project.id ? 'Hide' : 'Show'} cost events for ${project.title}`}
                        >
                          {expanded === project.id ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                          Cost Events
                        </button>
                      </td>
                    </tr>
                    {expanded === project.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-4">
                          {costSummary[project.id] && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="bg-white p-3 rounded border">
                                <p className="text-xs text-gray-600">Quoted</p>
                                <p className="text-lg font-bold">{formatMinor(costSummary[project.id].quoted_total_minor)}</p>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <p className="text-xs text-gray-600">Actual</p>
                                <p className="text-lg font-bold">{formatMinor(costSummary[project.id].actual_total_minor)}</p>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <p className="text-xs text-gray-600">Variance</p>
                                <p className={`text-lg font-bold ${costSummary[project.id].variance_minor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatMinor(costSummary[project.id].variance_minor)}
                                </p>
                              </div>
                            </div>
                          )}

                          {costEvents[project.id]?.length === 0 ? (
                            <p className="text-gray-600 mb-4">No cost events yet.</p>
                          ) : (
                            <table className="w-full text-sm mb-4">
                              <thead>
                                <tr className="text-left text-gray-600 border-b">
                                  <th scope="col" className="pb-2 px-2">Type</th>
                                  <th scope="col" className="pb-2 px-2">Description</th>
                                  <th scope="col" className="pb-2 px-2">Qty</th>
                                  <th scope="col" className="pb-2 px-2">Unit</th>
                                  <th scope="col" className="pb-2 px-2">Cost</th>
                                  <th scope="col" className="pb-2 px-2">Total</th>
                                  <th scope="col" className="pb-2 px-2">Supplier</th>
                                  <th scope="col" className="pb-2 px-2">Status</th>
                                  <th scope="col" className="pb-2 px-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {costEvents[project.id]?.map((event) => (
                                  <tr key={event.id} className="border-b last:border-b-0">
                                    <td className="py-2 px-2">{event.event_type}</td>
                                    <td className="py-2 px-2">{event.description}</td>
                                    <td className="py-2 px-2">{event.quantity}</td>
                                    <td className="py-2 px-2">{event.unit}</td>
                                    <td className="py-2 px-2">{formatMinor(event.unit_cost_minor)}</td>
                                    <td className="py-2 px-2">{formatMinor(event.total_minor)}</td>
                                    <td className="py-2 px-2">{event.supplier_name || '-'}</td>
                                    <td className="py-2 px-2">
                                      {event.is_approved ? (
                                        <span className="text-green-600 text-xs">Approved</span>
                                      ) : (
                                        <span className="text-yellow-600 text-xs">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2">
                                      {!event.is_approved && canApprove && (
                                        <button
                                          onClick={() => handleApprove(project.id, event.id)}
                                          className="btn btn-primary text-xs py-1 px-2"
                                          aria-label={`Approve cost event ${event.description}`}
                                        >
                                          <Check className="w-3 h-3 inline" aria-hidden="true" /> Approve
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-white p-3 rounded border">
                            <div>
                              <label htmlFor={`event-type-${project.id}`} className="label text-xs">Type</label>
                              <select
                                id={`event-type-${project.id}`}
                                value={newEvent[project.id]?.eventType || 'actual'}
                                onChange={(e) => setNewEvent((prev) => ({ ...prev, [project.id]: { ...prev[project.id], eventType: e.target.value } }))}
                                className="input text-sm py-1"
                              >
                                <option value="actual">actual</option>
                                <option value="substitution">substitution</option>
                                <option value="addition">addition</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`event-desc-${project.id}`} className="label text-xs">Description</label>
                              <input
                                id={`event-desc-${project.id}`}
                                type="text"
                                value={newEvent[project.id]?.description || ''}
                                onChange={(e) => setNewEvent((prev) => ({ ...prev, [project.id]: { ...prev[project.id], description: e.target.value } }))}
                                className="input text-sm py-1"
                              />
                            </div>
                            <div>
                              <label htmlFor={`event-qty-${project.id}`} className="label text-xs">Qty</label>
                              <input
                                id={`event-qty-${project.id}`}
                                type="number"
                                value={newEvent[project.id]?.quantity || 1}
                                onChange={(e) => setNewEvent((prev) => ({ ...prev, [project.id]: { ...prev[project.id], quantity: parseFloat(e.target.value) || 0 } }))}
                                className="input text-sm py-1"
                              />
                            </div>
                            <div>
                              <label htmlFor={`event-unit-${project.id}`} className="label text-xs">Unit</label>
                              <input
                                id={`event-unit-${project.id}`}
                                type="text"
                                value={newEvent[project.id]?.unit || ''}
                                onChange={(e) => setNewEvent((prev) => ({ ...prev, [project.id]: { ...prev[project.id], unit: e.target.value } }))}
                                className="input text-sm py-1"
                              />
                            </div>
                            <div>
                              <label htmlFor={`event-cost-${project.id}`} className="label text-xs">Unit Cost (minor)</label>
                              <input
                                id={`event-cost-${project.id}`}
                                type="number"
                                value={newEvent[project.id]?.unitCostMinor || 0}
                                onChange={(e) => setNewEvent((prev) => ({ ...prev, [project.id]: { ...prev[project.id], unitCostMinor: parseInt(e.target.value) || 0 } }))}
                                className="input text-sm py-1"
                              />
                            </div>
                            <div className="md:col-span-3 grid grid-cols-2 gap-2 items-end">
                              <div>
                                <label htmlFor={`event-supplier-${project.id}`} className="label text-xs">Supplier</label>
                                <select
                                  id={`event-supplier-${project.id}`}
                                  value={newEvent[project.id]?.supplierId || ''}
                                  onChange={(e) => setNewEvent((prev) => ({ ...prev, [project.id]: { ...prev[project.id], supplierId: e.target.value } }))}
                                  className="input text-sm py-1"
                                >
                                  <option value="">None</option>
                                  {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={() => handleCreateCostEvent(project.id)}
                                className="btn btn-primary text-sm py-1"
                              >
                                Add Cost Event
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="project-modal-title" className="text-lg font-semibold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="project-title" className="label">Project Title</label>
                <input
                  id="project-title"
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="project-client" className="label">Client ID</label>
                <input
                  id="project-client"
                  type="text"
                  value={newProject.clientId}
                  onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
                  className="input"
                  placeholder="Client UUID"
                  required
                />
              </div>
              <div>
                <label htmlFor="project-status" className="label">Status</label>
                <select
                  id="project-status"
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
