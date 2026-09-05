import { useState, useEffect, useCallback } from 'react'
import api from '../lib/axios'
import { Plus, Search, Filter, ChevronDown, ChevronUp, Paperclip } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import FileList from '../components/FileList'
import Pagination from '../components/Pagination'

interface Client {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  is_active: boolean
  created_at: string
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', contactName: '', email: '', phone: '', address: '' })
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fileRefresh, setFileRefresh] = useState(0)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/clients', {
        params: { page: pagination.page, pageSize: pagination.pageSize, search }
      })
      setClients(response.data.data)
      setPagination({
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      })
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }, [search, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/clients', newClient)
      setShowCreateModal(false)
      setNewClient({ name: '', contactName: '', email: '', phone: '', address: '' })
      fetchClients()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create client')
    }
  }

  const toggleFiles = (clientId: string) => {
    setExpanded((prev) => (prev === clientId ? null : clientId))
    setFileRefresh((prev) => prev + 1)
  }

  const handlePageChange = (page: number) => setPagination((p) => ({ ...p, page }))
  const handlePageSizeChange = (pageSize: number) => setPagination((p) => ({ ...p, page: 1, pageSize }))

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 text-sm lg:text-base">Manage your client organizations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full lg:w-auto justify-center"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Client
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 lg:mb-6 p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id="client-search"
            type="text"
            placeholder="Search clients..."
            className="input pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search clients"
          />
        </div>
        <button className="btn btn-secondary flex items-center gap-2 w-full lg:w-auto justify-center" aria-label="Filter clients">
          <Filter className="w-4 h-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Clients Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th scope="col" className="pb-3 px-6">Client Name</th>
                <th scope="col" className="pb-3 px-6">Contact</th>
                <th scope="col" className="pb-3 px-6">Email</th>
                <th scope="col" className="pb-3 px-6">Phone</th>
                <th scope="col" className="pb-3 px-6">Status</th>
                <th scope="col" className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600" aria-busy="true">Loading...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">No clients found</td>
                </tr>
              ) : (
                clients.map((client) => (
                  <>
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-6 font-medium">{client.name}</td>
                      <td className="py-4 px-6">{client.contact_name}</td>
                      <td className="py-4 px-6">{client.email}</td>
                      <td className="py-4 px-6">{client.phone}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleFiles(client.id)}
                          className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
                          aria-label={`${expanded === client.id ? 'Hide' : 'Show'} attachments for ${client.name}`}
                        >
                          {expanded === client.id ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                          <Paperclip className="w-4 h-4" aria-hidden="true" /> Files
                        </button>
                      </td>
                    </tr>
                    {expanded === client.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-4">
                          <h4 className="font-medium mb-2 text-sm">Client Attachments</h4>
                          <FileUpload
                            entityType="client"
                            entityId={client.id}
                            onUploadComplete={() => setFileRefresh((prev) => prev + 1)}
                            onError={(err) => alert(err)}
                          />
                          <div className="mt-4">
                            <FileList
                              entityType="client"
                              entityId={client.id}
                              refreshTrigger={fileRefresh}
                            />
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

      {/* Create Client Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="client-modal-title" className="text-lg font-semibold mb-4">Create New Client</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label htmlFor="client-name" className="label">Client Name</label>
                <input
                  id="client-name"
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="client-contact" className="label">Contact Name</label>
                <input
                  id="client-contact"
                  type="text"
                  value={newClient.contactName}
                  onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="client-email" className="label">Email</label>
                <input
                  id="client-email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="client-phone" className="label">Phone</label>
                <input
                  id="client-phone"
                  type="text"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="client-address" className="label">Address</label>
                <input
                  id="client-address"
                  type="text"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  className="input"
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
