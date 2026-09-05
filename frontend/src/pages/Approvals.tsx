import { useState, useEffect } from 'react'
import api from '../lib/axios'
import { Check, X, FileText } from 'lucide-react'

interface Approval {
  id: string
  quote_id: string
  quote_title: string
  client_name: string
  revision_number: number
  total_minor: number
  currency: string
  requested_by: string
  requested_at: string
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      const response = await api.get('/quotes/approvals/pending')
      setApprovals(response.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (approvalId: string, action: 'approve' | 'reject') => {
    const note = window.prompt(`${action === 'approve' ? 'Approve' : 'Reject'} quote. Add an optional note:`)
    if (note === null) return

    try {
      await api.post(`/quotes/approvals/${approvalId}/${action}`, { note })
      fetchApprovals()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || `${action} failed`)
    }
  }

  const formatCurrency = (minor: number, currency: string) => {
    return `${currency} ${(minor / 100).toFixed(2)}`
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 text-sm lg:text-base">Review and approve submitted quotes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th scope="col" className="pb-3 px-6">Quote</th>
                <th scope="col" className="pb-3 px-6">Client</th>
                <th scope="col" className="pb-3 px-6">Revision</th>
                <th scope="col" className="pb-3 px-6">Total</th>
                <th scope="col" className="pb-3 px-6">Requested By</th>
                <th scope="col" className="pb-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600" aria-busy="true">Loading...</td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">No pending approvals</td>
                </tr>
              ) : (
                approvals.map((approval) => (
                  <tr key={approval.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" aria-hidden="true" />
                        <span className="font-medium">{approval.quote_title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">{approval.client_name}</td>
                    <td className="py-4 px-6">{approval.revision_number}</td>
                    <td className="py-4 px-6">{formatCurrency(approval.total_minor, approval.currency)}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{approval.requested_by}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleAction(approval.id, 'approve')}
                        className="btn btn-primary text-sm py-1 px-3 mr-2"
                        aria-label={`Approve quote ${approval.quote_title}`}
                      >
                        <Check className="w-4 h-4 inline" aria-hidden="true" /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(approval.id, 'reject')}
                        className="btn btn-secondary text-sm py-1 px-3"
                        aria-label={`Reject quote ${approval.quote_title}`}
                      >
                        <X className="w-4 h-4 inline" aria-hidden="true" /> Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
