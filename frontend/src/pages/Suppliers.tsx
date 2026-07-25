import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Filter } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  lead_time_days: number
  is_active: boolean
  created_at: string
}

export default function Suppliers() {
  const { token } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', contactName: '', email: '', phone: '', leadTimeDays: 7 })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/api/v1/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuppliers(response.data.data)
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/suppliers', newSupplier, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreateModal(false)
      setNewSupplier({ name: '', contactName: '', email: '', phone: '', leadTimeDays: 7 })
      fetchSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create supplier')
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Manage your supplier relationships</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search suppliers..." 
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

      {/* Suppliers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 px-6">Supplier Name</th>
                <th className="pb-3 px-6">Contact</th>
                <th className="pb-3 px-6">Email</th>
                <th className="pb-3 px-6">Phone</th>
                <th className="pb-3 px-6">Lead Time</th>
                <th className="pb-3 px-6">Status</th>
                <th className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">Loading...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">No suppliers found</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium">{supplier.name}</td>
                    <td className="py-4 px-6">{supplier.contact_name}</td>
                    <td className="py-4 px-6">{supplier.email}</td>
                    <td className="py-4 px-6">{supplier.phone}</td>
                    <td className="py-4 px-6">{supplier.lead_time_days} days</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm ${supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
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

      {/* Create Supplier Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Supplier</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="label">Supplier Name</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input
                  type="text"
                  value={newSupplier.contactName}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Lead Time (days)</label>
                <input
                  type="number"
                  value={newSupplier.leadTimeDays}
                  onChange={(e) => setNewSupplier({ ...newSupplier, leadTimeDays: parseInt(e.target.value) })}
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
