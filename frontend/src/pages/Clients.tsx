import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Filter } from 'lucide-react'

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
  const { token } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', contactName: '', email: '', phone: '', address: '' })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/v1/clients', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setClients(response.data.data)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/clients', newClient, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreateModal(false)
      setNewClient({ name: '', contactName: '', email: '', phone: '', address: '' })
      fetchClients()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create client')
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client organizations</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search clients..." 
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

      {/* Clients Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 px-6">Client Name</th>
                <th className="pb-3 px-6">Contact</th>
                <th className="pb-3 px-6">Email</th>
                <th className="pb-3 px-6">Phone</th>
                <th className="pb-3 px-6">Status</th>
                <th className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">Loading...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">No clients found</td>
                </tr>
              ) : (
                filteredClients.map((client) => (
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

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Client</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="label">Client Name</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input
                  type="text"
                  value={newClient.contactName}
                  onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="text"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
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
