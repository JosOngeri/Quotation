import { useState } from 'react'
import AuditLogViewer from '../components/AuditLogViewer'
import api from '../lib/axios'
import { Download } from 'lucide-react'

export default function AuditLogs() {
  const [filters, setFilters] = useState<{
    action?: string
    entityType?: string
    startDate?: string
    endDate?: string
  }>({})

  const handleExport = async () => {
    try {
      const response = await api.get('/audit-logs/export', {
        params: filters,
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Export failed')
    }
  }

  const entityTypes = ['quote', 'project', 'client', 'supplier', 'product', 'user', 'settings']
  const actions = ['create', 'update', 'delete', 'login', 'logout', 'view', 'export', 'publish', 'approve', 'reject']

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 text-sm lg:text-base">Track workspace activity</p>
        </div>
        <button
          onClick={handleExport}
          className="btn btn-secondary flex items-center gap-2"
          aria-label="Export audit logs to CSV"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export CSV
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="audit-action" className="label">Action</label>
            <select
              id="audit-action"
              value={filters.action || ''}
              onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
              className="input"
            >
              <option value="">All</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-entity" className="label">Entity Type</label>
            <select
              id="audit-entity"
              value={filters.entityType || ''}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value || undefined })}
              className="input"
            >
              <option value="">All</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-start" className="label">Start Date</label>
            <input
              id="audit-start"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="audit-end" className="label">End Date</label>
            <input
              id="audit-end"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              className="input"
            />
          </div>
        </div>
      </div>

      <AuditLogViewer filters={filters} />
    </div>
  )
}
