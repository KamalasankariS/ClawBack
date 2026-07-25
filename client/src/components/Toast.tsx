import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

const TOAST_COLORS = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

// Global toast state
let listeners: Array<(toasts: ToastMessage[]) => void> = []
let toasts: ToastMessage[] = []

function notify() {
  listeners.forEach(fn => fn([...toasts]))
}

export function toast(type: ToastMessage['type'], message: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  toasts = [...toasts, { id, type, message }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 4000)
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(fn => fn !== setItems) }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
      {items.map(t => {
        const Icon = TOAST_ICONS[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm animate-slide-in ${TOAST_COLORS[t.type]}`}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => { toasts = toasts.filter(x => x.id !== t.id); notify() }}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
