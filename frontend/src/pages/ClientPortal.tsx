import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/axios'
import { FileText, CheckCircle, XCircle, MessageSquare, Send, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Quote {
  id: string
  title: string
  status: string
  currency: string
  total_minor: number
  valid_until: string
  created_at: string
}

interface QuoteDetail {
  id: string
  title: string
  status: string
  currency: string
  total_minor: number
  valid_until: string
  items: Array<{
    id: string
    description: string
    quantity: number
    unit: string
    sell_price_minor: number
    total_minor: number
  }>
}

interface Comment {
  id: string
  text: string
  created_by: string
  created_at: string
}

export default function ClientPortal() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [quoteDetail, setQuoteDetail] = useState<QuoteDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [actionNote, setActionNote] = useState('')

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const response = await api.get('/client-portal/quotes')
      setQuotes(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch client quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuote = async (quoteId: string) => {
    try {
      const [detailRes, commentsRes] = await Promise.all([
        api.get(`/client-portal/quotes/${quoteId}`),
        api.get(`/client-portal/quotes/${quoteId}/comments`)
      ])
      setQuoteDetail(detailRes.data.data)
      setComments(commentsRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch quote detail:', error)
    }
  }

  const handleSelect = (quoteId: string) => {
    setSelectedQuoteId(quoteId)
    fetchQuote(quoteId)
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedQuoteId) return
    try {
      await api.post(`/client-portal/quotes/${selectedQuoteId}/${action}`, { reason: actionNote })
      fetchQuote(selectedQuoteId)
      fetchQuotes()
      setActionNote('')
    } catch (error: any) {
      alert(error.response?.data?.error?.message || `${action} failed`)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuoteId || !newComment.trim()) return
    try {
      await api.post(`/client-portal/quotes/${selectedQuoteId}/comments`, { text: newComment })
      setNewComment('')
      fetchQuote(selectedQuoteId)
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to post comment')
    }
  }

  const formatMinor = (minor: number, currency = 'KES') => `${currency} ${(minor / 100).toFixed(2)}`

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (selectedQuoteId && quoteDetail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <button
              onClick={() => { setSelectedQuoteId(null); setQuoteDetail(null) }}
              className="btn btn-secondary p-2"
              aria-label="Back to quote list"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quoteDetail.title}</h1>
              <p className="text-sm text-gray-600">{quoteDetail.status} &middot; {quoteDetail.currency}</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 lg:p-8" id="main-content">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Quote Items</h2>
                {quoteDetail.items?.length === 0 ? (
                  <p className="text-gray-600">No items in this quote.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-600 border-b">
                          <th scope="col" className="pb-2 px-2">Description</th>
                          <th scope="col" className="pb-2 px-2">Qty</th>
                          <th scope="col" className="pb-2 px-2">Unit</th>
                          <th scope="col" className="pb-2 px-2">Price</th>
                          <th scope="col" className="pb-2 px-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteDetail.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-2 px-2">{item.description}</td>
                            <td className="py-2 px-2">{item.quantity}</td>
                            <td className="py-2 px-2">{item.unit}</td>
                            <td className="py-2 px-2">{formatMinor(item.sell_price_minor, quoteDetail.currency)}</td>
                            <td className="py-2 px-2 font-medium">{formatMinor(item.total_minor, quoteDetail.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-4 text-right text-xl font-bold">
                  Total: {formatMinor(quoteDetail.total_minor, quoteDetail.currency)}
                </div>
              </div>

              {quoteDetail.status === 'published' && (
                <div className="card p-6">
                  <h2 className="font-semibold mb-4">Approve or Reject</h2>
                  <div className="mb-4">
                    <label htmlFor="action-note" className="label">Note (optional)</label>
                    <textarea
                      id="action-note"
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="input"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('approve')}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" aria-hidden="true" /> Approve
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" aria-hidden="true" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" aria-hidden="true" /> Comments
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-600">No comments yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-800">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{comment.created_by} &middot; {new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  id="client-comment"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="input flex-1"
                  placeholder="Add a comment..."
                  aria-label="Add a comment"
                />
                <button type="submit" className="btn btn-primary" aria-label="Send comment">
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    )
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <FileText className="w-6 h-6 text-primary-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Quotes</p>
                <p className="text-2xl font-bold">{quotes.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold">{quotes.filter(q => q.status === 'accepted').length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{quotes.filter(q => q.status === 'rejected').length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Your Quotes</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-gray-600" aria-busy="true">Loading...</p>
            ) : quotes.length === 0 ? (
              <p className="text-gray-600">No quotes found</p>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <button
                    key={quote.id}
                    onClick={() => handleSelect(quote.id)}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${getStatusColor(quote.status)}`}>
                        <FileText className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-medium">{quote.title}</p>
                        <p className="text-sm text-gray-600">Total: {formatMinor(quote.total_minor, quote.currency)}</p>
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
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
