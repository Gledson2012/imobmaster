import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'

/* Página alvo do link de recuperação de senha (type=recovery).
   O Supabase autentica o usuário pelo link e dispara PASSWORD_RECOVERY;
   aqui ele define a nova senha via updateUser. */
export default function ResetPassword() {
  const { user, loading, recoveryMode, updatePassword, clearRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState({ text: '', kind: 'info' as 'info' | 'success' | 'error' })

  if (loading) return null
  if (!user && !recoveryMode) return <Navigate to="/auth" replace />

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg({ text: '', kind: 'info' })
    if (password.length < 6) {
      setMsg({ text: 'A senha precisa ter pelo menos 6 caracteres.', kind: 'error' })
      return
    }
    if (password !== confirm) {
      setMsg({ text: 'As senhas não conferem.', kind: 'error' })
      return
    }
    setSaving(true)
    try {
      const r = await updatePassword(password)
      if (r.error) {
        setMsg({ text: r.error, kind: 'error' })
      } else {
        setDone(true)
        clearRecovery()
        setMsg({ text: 'Senha redefinida com sucesso!', kind: 'success' })
      }
    } catch (err: any) {
      setMsg({ text: err?.message || 'Erro inesperado', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">IMOBMASTER · CONTA</div>
          <h1>Redefinir senha</h1>
          <p>{user ? `Defina uma nova senha para ${user.email}.` : 'Defina sua nova senha de acesso.'}</p>
        </div>
      </div>
      <section className="panel auth-panel">
        <div className="auth-card">
          {msg.text && <div className={`auth-msg auth-msg--${msg.kind}`}>{msg.text}</div>}
          {done ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <p className="muted">Você já está conectado com a nova senha.</p>
              <Link className="btn primary auth-btn" to="/">Ir para o painel <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <form onSubmit={handle} className="auth-form">
              <label className="auth-label">
                <Lock size={16} /> Nova senha
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <label className="auth-label">
                <Lock size={16} /> Confirmar nova senha
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" className="btn primary auth-btn" disabled={saving}>
                {saving ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
