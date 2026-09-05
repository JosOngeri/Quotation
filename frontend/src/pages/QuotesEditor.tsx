import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { Plus, Trash2, ChevronUp, ChevronDown, MessageSquare, Send, ArrowLeft, Save } from 'lucide-react'

interface QuoteItem {
  id: string
  description: string
  product_id?: string | null
  quantity: number
  unit: string
  unit_cost_minor: number
  sell_price_minor: number
  tax_rate: number
}

interface QuoteNode {
  id: string
  node_type: string
  title: string
  description: string
  ordinal: number
  children: QuoteNode[]
  items: QuoteItem[]
}

interface Quote {
  id: string
  title: string
  current_revision_id: string
  status: string
  currency: string
}

interface Comment {
  id: string
  text: string
  created_by: string
  created_at: string
}

const formatMinor = (minor: number, currency = 'KES') => `${currency} ${(minor / 100).toFixed(2)}`

export default function QuotesEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [revisionId, setRevisionId] = useState<string | null>(null)
  const [tree, setTree] = useState<QuoteNode[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')

  const fetchQuote = useCallback(async () => {
    try {
      const res = await api.get(`/quotes/${id}`)
      setQuote(res.data.data)
      setRevisionId(res.data.data.current_revision_id)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load quote')
    }
  }, [id])

  const fetchTree = useCallback(async (revId: string) => {
    try {
      const res = await api.get(`/quotes/${id}/revisions/${revId}/tree`)
      setTree(res.data.data.nodes)
      setTotals(res.data.data.totals)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load quote tree')
    }
  }, [id])

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/quotes/${id}/comments`)
      setComments(res.data.data || [])
    } catch (err: any) {
      console.error('Failed to load comments:', err)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchQuote().then(async () => {
      if (revisionId) {
        await fetchTree(revisionId)
      }
      await fetchComments()
      setLoading(false)
    })
  }, [id, fetchQuote, fetchTree, fetchComments, revisionId])

  const refresh = async () => {
    if (id && revisionId) {
      await fetchQuote()
      await fetchTree(revisionId)
    }
  }

  const handleAddSection = async () => {
    if (!id || !revisionId) return
    try {
      await api.post(`/quotes/${id}/revisions/${revisionId}/nodes`, {
        node_type: 'section',
        title: 'New Section',
        description: '',
        parent_id: null,
        ordinal: tree.length + 1
      })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to add section')
    }
  }

  const handleNodeChange = async (nodeId: string, title: string) => {
    if (!id || !revisionId) return
    try {
      await api.put(`/quotes/${id}/revisions/${revisionId}/nodes/${nodeId}`, { title })
      setTree((prev) => updateNode(prev, nodeId, (n) => ({ ...n, title })))
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update node')
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    if (!id || !revisionId || !window.confirm('Delete this node and its children?')) return
    try {
      await api.delete(`/quotes/${id}/revisions/${revisionId}/nodes/${nodeId}`)
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete node')
    }
  }

  const handleAddChild = async (parentId: string) => {
    if (!id || !revisionId) return
    try {
      const parent = findNode(tree, parentId)
      await api.post(`/quotes/${id}/revisions/${revisionId}/nodes`, {
        node_type: 'section',
        title: 'New Sub-section',
        description: '',
        parent_id: parentId,
        ordinal: parent?.children?.length ? parent.children.length + 1 : 1
      })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to add child')
    }
  }

  const handleAddItem = async (nodeId: string) => {
    if (!id || !revisionId) return
    try {
      await api.post(`/quotes/${id}/revisions/${revisionId}/nodes/${nodeId}/items`, {
        description: 'New item',
        quantity: 1,
        unit: 'ea',
        unit_cost_minor: 0,
        sell_price_minor: 0,
        tax_rate: 0
      })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to add item')
    }
  }

  const handleItemChange = (nodeId: string, itemId: string, updates: Partial<QuoteItem>) => {
    setTree((prev) => updateNode(prev, nodeId, (n) => ({
      ...n,
      items: n.items.map((item) => item.id === itemId ? { ...item, ...updates } : item)
    })))
  }

  const saveItem = async (nodeId: string, itemId: string, item: QuoteItem) => {
    if (!id || !revisionId) return
    try {
      await api.put(`/quotes/${id}/revisions/${revisionId}/items/${itemId}`, item)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!id || !revisionId) return
    try {
      await api.delete(`/quotes/${id}/revisions/${revisionId}/items/${itemId}`)
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete item')
    }
  }

  const handleReorder = async (nodeId: string, direction: 'up' | 'down', nodeList: QuoteNode[]) => {
    if (!id || !revisionId) return
    const index = nodeList.findIndex((n) => n.id === nodeId)
    if (index < 0) return
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= nodeList.length) return
    const other = nodeList[target]
    const newOrdinal = other.ordinal
    const otherNewOrdinal = nodeList[index].ordinal
    try {
      await api.put(`/quotes/${id}/revisions/${revisionId}/nodes/${nodeId}`, { ordinal: newOrdinal })
      await api.put(`/quotes/${id}/revisions/${revisionId}/nodes/${other.id}`, { ordinal: otherNewOrdinal })
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to reorder')
    }
  }

  const handlePublish = async () => {
    if (!id) return
    try {
      await api.post(`/quotes/${id}/publish`)
      refresh()
      setError('')
    } catch (err: any) {
      const code = err.response?.data?.error?.code
      if (code === 'MISSING_PRICES') {
        setError('All items must have a sell price or supplier offer before publishing.')
      } else {
        setError(err.response?.data?.error?.message || 'Failed to publish')
      }
    }
  }

  const handleNewRevision = async () => {
    if (!id) return
    try {
      const res = await api.post(`/quotes/${id}/new-revision`)
      setRevisionId(res.data.data.id)
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create revision')
    }
  }

  const handleSubmit = async () => {
    if (!id) return
    try {
      await api.post(`/quotes/${id}/submit-for-approval`)
      refresh()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to submit')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newComment.trim()) return
    try {
      await api.post(`/quotes/${id}/comments`, { text: newComment })
      setNewComment('')
      fetchComments()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to post comment')
    }
  }

  const computeLineTotal = (item: QuoteItem) => {
    const subtotal = item.sell_price_minor * item.quantity
    const tax = subtotal * (item.tax_rate / 100)
    return (subtotal + tax) / 100
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600" aria-busy="true">Loading quote editor...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-red-600" role="alert">{error}</div>
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/quotes')}
            className="btn btn-secondary p-2"
            aria-label="Back to quotes"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{quote?.title}</h1>
            <p className="text-gray-600 text-sm">Quote editor &middot; {quote?.status} &middot; {quote?.currency}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleAddSection} className="btn btn-secondary text-sm">
            <Plus className="w-4 h-4 inline" aria-hidden="true" /> Add Section
          </button>
          <button onClick={handleNewRevision} className="btn btn-secondary text-sm">
            New Revision
          </button>
          <button onClick={handlePublish} className="btn btn-primary text-sm">
            Publish
          </button>
          <button onClick={handleSubmit} className="btn btn-primary text-sm">
            Submit for Approval
          </button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-600">Subtotal</p>
            <p className="text-xl font-bold">{formatMinor(totals.subtotal_minor || 0, quote?.currency)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-600">Tax</p>
            <p className="text-xl font-bold">{formatMinor(totals.tax_minor || 0, quote?.currency)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold">{formatMinor(totals.total_minor || 0, quote?.currency)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {tree.map((node) => (
            <NodeEditor
              key={node.id}
              node={node}
              depth={0}
              onTitleChange={handleNodeChange}
              onAddChild={handleAddChild}
              onAddItem={handleAddItem}
              onDelete={handleDeleteNode}
              onItemChange={handleItemChange}
              onSaveItem={saveItem}
              onDeleteItem={handleDeleteItem}
              onReorder={handleReorder}
              siblings={tree}
              quoteCurrency={quote?.currency || 'KES'}
              computeLineTotal={computeLineTotal}
            />
          ))}

          {tree.length === 0 && (
            <div className="card p-8 text-center text-gray-600">
              <p>No sections yet. Click "Add Section" to start building your quote.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" aria-hidden="true" /> Comments
            </h3>
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
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                id="new-comment"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="input flex-1"
                placeholder="Add a comment..."
                aria-label="Add a comment"
              />
              <button
                type="submit"
                className="btn btn-primary"
                aria-label="Send comment"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NodeEditorProps {
  node: QuoteNode
  depth: number
  onTitleChange: (id: string, title: string) => void
  onAddChild: (id: string) => void
  onAddItem: (id: string) => void
  onDelete: (id: string) => void
  onItemChange: (nodeId: string, itemId: string, updates: Partial<QuoteItem>) => void
  onSaveItem: (nodeId: string, itemId: string, item: QuoteItem) => void
  onDeleteItem: (itemId: string) => void
  onReorder: (id: string, direction: 'up' | 'down', siblings: QuoteNode[]) => void
  siblings: QuoteNode[]
  quoteCurrency: string
  computeLineTotal: (item: QuoteItem) => number
}

function NodeEditor({
  node,
  depth,
  onTitleChange,
  onAddChild,
  onAddItem,
  onDelete,
  onItemChange,
  onSaveItem,
  onDeleteItem,
  onReorder,
  siblings,
  quoteCurrency,
  computeLineTotal
}: NodeEditorProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null)

  return (
    <div className={`card p-4 ${depth > 0 ? 'ml-4 border-l-4 border-l-primary-200' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <input
          id={`node-title-${node.id}`}
          type="text"
          value={node.title}
          onChange={(e) => onTitleChange(node.id, e.target.value)}
          className="input font-semibold"
          aria-label="Section title"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => onReorder(node.id, 'up', siblings)}
            className="p-2 hover:bg-gray-100 rounded"
            aria-label="Move section up"
          >
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onReorder(node.id, 'down', siblings)}
            className="p-2 hover:bg-gray-100 rounded"
            aria-label="Move section down"
          >
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onAddChild(node.id)}
            className="p-2 hover:bg-gray-100 rounded"
            aria-label="Add child section"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-2 hover:bg-gray-100 rounded text-red-600"
            aria-label="Delete section"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {node.items.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th scope="col" className="pb-2 px-2">Description</th>
                <th scope="col" className="pb-2 px-2">Qty</th>
                <th scope="col" className="pb-2 px-2">Unit</th>
                <th scope="col" className="pb-2 px-2">Cost</th>
                <th scope="col" className="pb-2 px-2">Sell</th>
                <th scope="col" className="pb-2 px-2">Tax %</th>
                <th scope="col" className="pb-2 px-2">Total</th>
                <th scope="col" className="pb-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {node.items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => onItemChange(node.id, item.id, { description: e.target.value })}
                      className="input text-sm py-1"
                      aria-label="Item description"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onItemChange(node.id, item.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="input text-sm py-1 w-20"
                      aria-label="Quantity"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => onItemChange(node.id, item.id, { unit: e.target.value })}
                      className="input text-sm py-1 w-20"
                      aria-label="Unit"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={item.unit_cost_minor}
                      onChange={(e) => onItemChange(node.id, item.id, { unit_cost_minor: parseInt(e.target.value) || 0 })}
                      className="input text-sm py-1 w-24"
                      aria-label="Unit cost minor"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={item.sell_price_minor}
                      onChange={(e) => onItemChange(node.id, item.id, { sell_price_minor: parseInt(e.target.value) || 0 })}
                      className="input text-sm py-1 w-24"
                      aria-label="Sell price minor"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={item.tax_rate}
                      onChange={(e) => onItemChange(node.id, item.id, { tax_rate: parseFloat(e.target.value) || 0 })}
                      className="input text-sm py-1 w-20"
                      aria-label="Tax rate"
                    />
                  </td>
                  <td className="py-2 px-2 font-medium">
                    {formatMinor(computeLineTotal(item) * 100, quoteCurrency)}
                  </td>
                  <td className="py-2 px-2">
                    {editingItem === item.id ? (
                      <button
                        onClick={() => { onSaveItem(node.id, item.id, item); setEditingItem(null) }}
                        className="p-1 text-primary-600"
                        aria-label="Save item"
                      >
                        <Save className="w-4 h-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingItem(item.id)}
                        className="p-1 text-gray-600"
                        aria-label="Edit item"
                      >
                        <Save className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-red-600"
                      aria-label="Delete item"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => onAddItem(node.id)}
          className="btn btn-secondary text-sm py-1 px-3"
        >
          <Plus className="w-3 h-3 inline" aria-hidden="true" /> Add Item
        </button>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-4 mt-4">
          {node.children.map((child) => (
            <NodeEditor
              key={child.id}
              node={child}
              depth={depth + 1}
              onTitleChange={onTitleChange}
              onAddChild={onAddChild}
              onAddItem={onAddItem}
              onDelete={onDelete}
              onItemChange={onItemChange}
              onSaveItem={onSaveItem}
              onDeleteItem={onDeleteItem}
              onReorder={onReorder}
              siblings={node.children}
              quoteCurrency={quoteCurrency}
              computeLineTotal={computeLineTotal}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function updateNode(nodes: QuoteNode[], id: string, updater: (n: QuoteNode) => QuoteNode): QuoteNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return updater(node)
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: updateNode(node.children, id, updater) }
    }
    return node
  })
}

function findNode(nodes: QuoteNode[], id: string): QuoteNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}
