import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Toast = { id: string; message: string; kind: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void } }

type ToastContextType = {
  toasts: Toast[]
  show: (message: string, kind?: 'success' | 'error' | 'info', action?: { label: string; onClick: () => void }) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'info', action?: { label: string; onClick: () => void }) => {
    const id = crypto.randomUUID()
    setToasts((old) => [...old, { id, message, kind, action }])
    setTimeout(() => setToasts((old) => old.filter((t) => t.id !== id)), 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((old) => old.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            {t.kind === 'success' ? <CheckCircle2 size={17} /> : t.kind === 'error' ? <AlertCircle size={17} /> : <Info size={17} />}
            <span className="toast-message">{t.message}</span>
            {t.action && <button className="toast-action" onClick={() => { t.action?.onClick(); dismiss(t.id) }}>{t.action.label}</button>}
            <button className="toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Fechar notificação"><X size={14} /></button>
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
