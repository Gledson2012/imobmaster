import { useState } from 'react'
import { Lock, ArrowRight } from 'lucide-react'
import { verifyLockPassword } from '../lib/lock'

export default function Unlock({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await verifyLockPassword(pwd)) {
      onUnlock()
    } else {
      setErr('Senha incorreta.')
    }
  }

  return (
    <div className="page-content" style={{ maxWidth: 420, margin: '10vh auto' }}>
      <section className="panel auth-panel">
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lock size={20} /> <h2 style={{ margin: 0 }}>App bloqueado</h2>
          </div>
          <form onSubmit={submit} className="auth-form">
            {err && <div className="auth-msg auth-msg--error">{err}</div>}
            <label className="auth-label">
              Senha
              <input type="password" required value={pwd} onChange={e => setPwd(e.target.value)} autoFocus />
            </label>
            <button type="submit" className="btn primary auth-btn">Desbloquear <ArrowRight size={16} /></button>
          </form>
        </div>
      </section>
    </div>
  )
}