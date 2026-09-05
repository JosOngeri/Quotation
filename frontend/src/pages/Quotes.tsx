import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { Plus, Search, Filter } from 'lucide-react'
import Pagination from '../components/Pagination'

interface Quote {
  id: string
  title: string
  status: string
  currency: string
  valid_until: string
  client_name: string
  created_at: string
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newQuote, setNewQuote] = useState({ title: '', clientId: '', validUntil: '' })
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const navigate = useNavigate()

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      }
      if (search) params.search = search

      const response = await api.get('/quotes', { params })
      setQuotes(response.data.data)
      setPagination({
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      })
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    } finally {
      setLoading(false)
    }
  }, [search, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/quotes', newQuote)
      setShowCreateModal(false)
      setNewQuote({ title: '', clientId: '', validUntil: '' })
      fetchQuotes()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create quote')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'published': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page })
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ ...pagination, page: 1, pageSize })
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600 text-sm lg:text-base">Manage your quotations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full lg:w-auto justify-center"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Quote
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 lg:mb-6 p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id="quote-search"
            type="text"
            placeholder="Search quotes..."
            className="input pl-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search quotes"
          />
        </div>
        <button className="btn btn-secondary flex items-center gap-2 w-full lg:w-auto justify-center" aria-label="Filter quotes">
          <Filter className="w-4 h-4" aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Quotes Table - Desktop */}
      <div className="card hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th scope="col" className="pb-3 px-6">Quote #</th>
                <th scope="col" className="pb-3 px-6">Title</th>
                <th scope="col" className="pb-3 px-6">Client</th>
                <th scope="col" className="pb-3 px-6">Status</th>
                <th scope="col" className="pb-3 px-6">Valid Until</th>
                <th scope="col" className="pb-3 px-6">Created</th>
                <th scope="col" className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600" aria-busy="true">Loading...</td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">No quotes found</td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium">QT-{quote.id.slice(0, 8)}</td>
                    <td className="py-4 px-6">{quote.title}</td>
                    <td className="py-4 px-6">{quote.client_name}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => navigate(`/quotes/${quote.id}/edit`)}
                        className="text-primary-600 hover:text-primary-800 mr-2"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotes Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="card p-4 text-center text-gray-600" aria-busy="true">Loading...</div>
        ) : quotes.length === 0 ? (
          <div className="card p-4 text-center text-gray-600">No quotes found</div>
        ) : (
          quotes.map((quote) => (
            <button
              key={quote.id}
              onClick={() => navigate(`/quotes/${quote.id}/edit`)}
              className="card p-4 w-full text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">QT-{quote.id.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-600 truncate">{quote.title}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ml-2 ${getStatusColor(quote.status)}`}>
                  {quote.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                <span>{quote.client_name}</span>
                <span>{new Date(quote.created_at).toLocaleDateString()}</span>
              </div>
              {quote.valid_until && (
                <div className="text-xs text-gray-500 mb-3">
                  Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                </div>
              )}
            </button>
          ))
        )}
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

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-modal-title"
        >
          <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="quote-modal-title" className="text-lg font-semibold mb-4">Create New Quote</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div>
                <label htmlFor="quote-title" className="label">Quote Title</label>
                <input
                  id="quote-title"
                  type="text"
                  value={newQuote.title}
                  onChange={(e) => setNewQuote({ ...newQuote, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="quote-client" className="label">Client ID</label>
                <input
                  id="quote-client"
                  type="text"
                  value={newQuote.clientId}
                  onChange={(e) => setNewQuote({ ...newQuote, clientId: e.target.value })}
                  className="input"
                  placeholder="Client UUID"
                  required
                />
              </div>
              <div>
                <label htmlFor="quote-valid" className="label">Valid Until</label>
                <input
                  id="quote-valid"
                  type="date"
                  value={newQuote.validUntil}
                  onChange={(e) => setNewQuote({ ...newQuote, validUntil: e.target.value })}
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
