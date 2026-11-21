import { useState } from 'react'
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from './AuthProvider'

type Mode = 'login' | 'register' | 'reset'

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', kind: 'info' as 'info' | 'success' | 'error' })
  const { signIn, signUp, signOut, resetPassword, isConfigured } = useAuth()

  const setMsg = (text: string, kind: 'info' | 'success' | 'error' = 'info') => {
    setMessage({ text, kind })
    setTimeout(() => setMessage({ text: '', kind: 'info' }), 5000)
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', kind: 'info' })
    try {
      if (mode === 'login') {
        const r = await signIn(email, password)
        if (r.error) setMsg(r.error, 'error')
        else setMsg('Bem-vindo de volta!', 'success')
      } else if (mode === 'register') {
        const r = await signUp(email, password, fullName)
        if (r.error) setMsg(r.error, 'error')
        else if (r.needsConfirmation) setMsg('Conta criada! Confirme seu e-mail para entrar.', 'success')
        else setMsg('Conta criada com sucesso!', 'success')
      } else {
        const r = await resetPassword(email)
        if (r.error) setMsg(r.error, 'error')
        else setMsg('Enviamos instruções de redefinição para seu e-mail.', 'success')
      }
    } catch (err: any) {
      setMsg(err?.message || 'Erro inesperado', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isConfigured) {
    return (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">AUTENTICAÇÃO</div>
            <h1>Supabase não configurado</h1>
            <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env para habilitar login e persistência.</p>
          </div>
        </div>
        <section className="panel settings-panel">
          <h2>Passos rápidos</h2>
          <ol className="muted">
            <li>Crie um projeto em <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a></li>
            <li>Execute o conteúdo de <code>supabase/schema.sql</code> no SQL Editor</li>
            <li>Copie Project URL e a chave <b>anon</b> para o .env</li>
            <li>Reinicie o servidor (<code>npm run dev</code>)</li>
          </ol>
        </section>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">IMOBMASTER · CONTA</div>
          <h1>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Redefinir senha'}</h1>
          <p>Acesse seu escritório imobiliário com e-mail e senha.</p>
        </div>
      </div>
      <section className="panel auth-panel">
        <div className="auth-card">
          {message.text && <div className={`auth-msg auth-msg--${message.kind}`}>{message.text}</div>}
          <form onSubmit={handle} className="auth-form">
            {mode === 'register' && (
              <label className="auth-label">
                <User size={16} /> Nome completo
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Gledson Crist"
                />
              </label>
            )}
            <label className="auth-label">
              <Mail size={16} /> E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </label>
            {mode !== 'reset' && (
              <label className="auth-label">
                <Lock size={16} /> Senha
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
            )}
            <button type="submit" className="btn primary auth-btn" disabled={loading}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Redefinir senha'}
            </button>
          </form>
          <div className="auth-footer">
            {mode === 'login' ? (
              <>
                <span>Não tem conta? </span><button type="button" className="auth-link" onClick={() => setMode('register')}>Criar conta</button>
                <br />
                <span>Esqueceu a senha? </span><button type="button" className="auth-link" onClick={() => setMode('reset')}>Redefinir senha</button>
              </>
            ) : mode === 'register' ? (
              <>
                <span>Já tem conta? </span><button type="button" className="auth-link" onClick={() => setMode('login')}>Entrar</button>
              </>
            ) : (
              <>
                <span>Lembrou a senha? </span><button type="button" className="auth-link" onClick={() => setMode('login')}>Entrar</button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
