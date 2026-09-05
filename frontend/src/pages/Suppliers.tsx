import { useState, useEffect, useCallback } from 'react'
import api from '../lib/axios'
import { Plus, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import Pagination from '../components/Pagination'

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

interface Product {
  id: string
  name: string
  unit: string
}

interface Offer {
  id: string
  product_id: string
  product_name: string
  unit_amount_minor: number
  unit: string
  effective_from: string
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', contactName: '', email: '', phone: '', leadTimeDays: 7 })
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [offers, setOffers] = useState<Record<string, Offer[]>>({})
  const [offersLoading, setOffersLoading] = useState<Record<string, boolean>>({})
  const [newOffer, setNewOffer] = useState<Record<string, { productId: string; unitAmountMinor: number; unit: string; effectiveFrom: string }>>({})

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/suppliers', {
        params: { page: pagination.page, pageSize: pagination.pageSize, search }
      })
      setSuppliers(response.data.data)
      setPagination({
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      })
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, pagination.page, pagination.pageSize])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { params: { pageSize: 1000 } })
      setProducts(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  useEffect(() => {
    fetchSuppliers()
    fetchProducts()
  }, [fetchSuppliers])

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/suppliers', newSupplier)
      setShowCreateModal(false)
      setNewSupplier({ name: '', contactName: '', email: '', phone: '', leadTimeDays: 7 })
      fetchSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create supplier')
    }
  }

  const toggleOffers = async (supplierId: string) => {
    if (expanded === supplierId) {
      setExpanded(null)
      return
    }
    setExpanded(supplierId)
    setOffersLoading((prev) => ({ ...prev, [supplierId]: true }))
    try {
      const response = await api.get(`/suppliers/${supplierId}/offers`)
      setOffers((prev) => ({ ...prev, [supplierId]: response.data.data || [] }))
      setNewOffer((prev) => ({ ...prev, [supplierId]: { productId: '', unitAmountMinor: 0, unit: '', effectiveFrom: '' } }))
    } catch (error) {
      console.error('Failed to fetch offers:', error)
    } finally {
      setOffersLoading((prev) => ({ ...prev, [supplierId]: false }))
    }
  }

  const handleCreateOffer = async (supplierId: string) => {
    const offer = newOffer[supplierId]
    if (!offer || !offer.productId) return
    try {
      await api.post(`/suppliers/${supplierId}/offers`, offer)
      const response = await api.get(`/suppliers/${supplierId}/offers`)
      setOffers((prev) => ({ ...prev, [supplierId]: response.data.data || [] }))
      setNewOffer((prev) => ({ ...prev, [supplierId]: { productId: '', unitAmountMinor: 0, unit: '', effectiveFrom: '' } }))
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create offer')
    }
  }

  const formatMinor = (minor: number) => (minor / 100).toFixed(2)

  const handlePageChange = (page: number) => setPagination((p) => ({ ...p, page }))
  const handlePageSizeChange = (pageSize: number) => setPagination((p) => ({ ...p, page: 1, pageSize }))

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600 text-sm lg:text-base">Manage your supplier relationships</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full lg:w-auto justify-center"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 lg:mb-6 p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id="supplier-search"
            type="text"
            placeholder="Search suppliers..."
            className="input pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search suppliers"
          />
        </div>
        <button className="btn btn-secondary flex items-center gap-2 w-full lg:w-auto justify-center" aria-label="Filter suppliers">
          <Filter className="w-4 h-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th scope="col" className="pb-3 px-6">Supplier Name</th>
                <th scope="col" className="pb-3 px-6">Contact</th>
                <th scope="col" className="pb-3 px-6">Email</th>
                <th scope="col" className="pb-3 px-6">Phone</th>
                <th scope="col" className="pb-3 px-6">Lead Time</th>
                <th scope="col" className="pb-3 px-6">Status</th>
                <th scope="col" className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600" aria-busy="true">Loading...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">No suppliers found</td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <>
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
                        <button
                          onClick={() => toggleOffers(supplier.id)}
                          className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
                          aria-label={`${expanded === supplier.id ? 'Hide' : 'Show'} offers for ${supplier.name}`}
                        >
                          {expanded === supplier.id ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                          Offers
                        </button>
                      </td>
                    </tr>
                    {expanded === supplier.id && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 p-4">
                          {offersLoading[supplier.id] ? (
                            <p className="text-center text-gray-600" aria-busy="true">Loading offers...</p>
                          ) : (
                            <div className="space-y-4">
                              {offers[supplier.id]?.length === 0 ? (
                                <p className="text-gray-600">No offers yet.</p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-gray-600 border-b">
                                      <th scope="col" className="pb-2 px-2">Product</th>
                                      <th scope="col" className="pb-2 px-2">Unit Amount</th>
                                      <th scope="col" className="pb-2 px-2">Unit</th>
                                      <th scope="col" className="pb-2 px-2">Effective From</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {offers[supplier.id]?.map((offer) => (
                                      <tr key={offer.id} className="border-b last:border-b-0">
                                        <td className="py-2 px-2">{offer.product_name}</td>
                                        <td className="py-2 px-2">{formatMinor(offer.unit_amount_minor)}</td>
                                        <td className="py-2 px-2">{offer.unit}</td>
                                        <td className="py-2 px-2">{offer.effective_from ? new Date(offer.effective_from).toLocaleDateString() : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                                <div>
                                  <label htmlFor={`offer-product-${supplier.id}`} className="label text-xs">Product</label>
                                  <select
                                    id={`offer-product-${supplier.id}`}
                                    value={newOffer[supplier.id]?.productId || ''}
                                    onChange={(e) => setNewOffer((prev) => ({ ...prev, [supplier.id]: { ...prev[supplier.id], productId: e.target.value, unit: products.find((p) => p.id === e.target.value)?.unit || '' } }))}
                                    className="input text-sm py-1"
                                  >
                                    <option value="">Select product</option>
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label htmlFor={`offer-amount-${supplier.id}`} className="label text-xs">Amount (minor)</label>
                                  <input
                                    id={`offer-amount-${supplier.id}`}
                                    type="number"
                                    value={newOffer[supplier.id]?.unitAmountMinor || 0}
                                    onChange={(e) => setNewOffer((prev) => ({ ...prev, [supplier.id]: { ...prev[supplier.id], unitAmountMinor: parseInt(e.target.value) || 0 } }))}
                                    className="input text-sm py-1"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`offer-unit-${supplier.id}`} className="label text-xs">Unit</label>
                                  <input
                                    id={`offer-unit-${supplier.id}`}
                                    type="text"
                                    value={newOffer[supplier.id]?.unit || ''}
                                    onChange={(e) => setNewOffer((prev) => ({ ...prev, [supplier.id]: { ...prev[supplier.id], unit: e.target.value } }))}
                                    className="input text-sm py-1"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`offer-date-${supplier.id}`} className="label text-xs">Effective From</label>
                                  <input
                                    id={`offer-date-${supplier.id}`}
                                    type="date"
                                    value={newOffer[supplier.id]?.effectiveFrom || ''}
                                    onChange={(e) => setNewOffer((prev) => ({ ...prev, [supplier.id]: { ...prev[supplier.id], effectiveFrom: e.target.value } }))}
                                    className="input text-sm py-1"
                                  />
                                </div>
                                <button
                                  onClick={() => handleCreateOffer(supplier.id)}
                                  className="btn btn-primary text-sm py-1"
                                >
                                  Add Offer
                                </button>
                              </div>
                            </div>
                          )}
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

      {/* Create Supplier Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="supplier-modal-title" className="text-lg font-semibold mb-4">Create New Supplier</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label htmlFor="supplier-name" className="label">Supplier Name</label>
                <input
                  id="supplier-name"
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="supplier-contact" className="label">Contact Name</label>
                <input
                  id="supplier-contact"
                  type="text"
                  value={newSupplier.contactName}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="supplier-email" className="label">Email</label>
                <input
                  id="supplier-email"
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="supplier-phone" className="label">Phone</label>
                <input
                  id="supplier-phone"
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="supplier-lead" className="label">Lead Time (days)</label>
                <input
                  id="supplier-lead"
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
