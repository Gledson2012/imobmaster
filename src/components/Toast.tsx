import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'

type Toast = { id: string; message: string; kind: 'success' | 'error' | 'info' }

type ToastContextType = {
  toasts: Toast[]
  show: (message: string, kind?: 'success' | 'error' | 'info') => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID()
    setToasts((old) => [...old, { id, message, kind }])
    setTimeout(() => setToasts((old) => old.filter((t) => t.id !== id)), 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((old) => old.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <div className="toast-container" style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              padding: '10px 14px',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              minWidth: 260,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: t.kind === 'success' ? '#155e3f' : t.kind === 'error' ? '#7f1d1d' : '#1e3a5f',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
