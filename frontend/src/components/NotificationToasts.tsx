import { useEffect, useState } from 'react'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { X } from 'lucide-react'

interface Toast {
  id: string
  title: string
  message: string
}

export default function NotificationToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (title: string, message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  useSocketEvent('quote:update', (data) => addToast('Quote updated', data?.title || 'A quote was updated'))
  useSocketEvent('project:update', (data) => addToast('Project updated', data?.title || 'A project was updated'))
  useSocketEvent('client:created', (data) => addToast('Client created', data?.name || 'A new client was added'))
  useSocketEvent('supplier:created', (data) => addToast('Supplier created', data?.name || 'A new supplier was added'))

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 min-w-[280px] max-w-sm"
          role="status"
        >
          <div className="flex-1">
            <p className="font-medium text-sm">{toast.title}</p>
            <p className="text-xs text-gray-300">{toast.message}</p>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="p-1 hover:bg-gray-800 rounded"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
