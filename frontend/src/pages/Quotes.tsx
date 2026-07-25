import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Filter } from 'lucide-react'

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
  const { token } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newQuote, setNewQuote] = useState({ title: '', clientId: '', validUntil: '' })

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      const response = await axios.get('/api/v1/quotes', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setQuotes(response.data.data)
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/quotes', newQuote, {
        headers: { Authorization: `Bearer ${token}` }
      })
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
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 lg:mb-6 p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotes..."
            className="input pl-10"
          />
        </div>
        <button className="btn btn-secondary flex items-center gap-2 w-full lg:w-auto justify-center">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Quotes Table - Desktop */}
      <div className="card hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 px-6">Quote #</th>
                <th className="pb-3 px-6">Title</th>
                <th className="pb-3 px-6">Client</th>
                <th className="pb-3 px-6">Status</th>
                <th className="pb-3 px-6">Valid Until</th>
                <th className="pb-3 px-6">Created</th>
                <th className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">Loading...</td>
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

      {/* Quotes Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="card p-4 text-center text-gray-600">Loading...</div>
        ) : quotes.length === 0 ? (
          <div className="card p-4 text-center text-gray-600">No quotes found</div>
        ) : (
          quotes.map((quote) => (
            <div key={quote.id} className="card p-4">
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
              <div className="flex gap-2">
                <button className="flex-1 btn btn-secondary text-sm py-2">View</button>
                <button className="flex-1 btn btn-secondary text-sm py-2">Edit</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Quote</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div>
                <label className="label">Quote Title</label>
                <input
                  type="text"
                  value={newQuote.title}
                  onChange={(e) => setNewQuote({ ...newQuote, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Client ID</label>
                <input
                  type="text"
                  value={newQuote.clientId}
                  onChange={(e) => setNewQuote({ ...newQuote, clientId: e.target.value })}
                  className="input"
                  placeholder="Client UUID"
                  required
                />
              </div>
              <div>
                <label className="label">Valid Until</label>
                <input
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
