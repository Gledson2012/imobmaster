import { useMemo, useState, useEffect } from 'react'
import { isSupabaseConfigured, fetchProfile, updateProfile } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { signOut } from '../lib/auth'
import type { UserProfile } from '../types'
import { useQuery } from '@tanstack/react-query'

export default function Settings() {
  const { user, signOut: authSignOut } = useAuth()
  const [name, setName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', kind: 'info' as 'info' | 'success' | 'error' })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user?.id ?? ''),
  })

  useEffect(() => {
    if (!user) return
    setName(profile?.full_name || user.full_name || '')
    setPhone(profile?.phone || '')
  }, [user, profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', kind: 'info' })
    try {
      if (user) {
        const r = await updateProfile(user.id, { full_name: name, phone: phone })
        if (r.error) setMsg({ text: r.error, kind: 'error' })
        else setMsg({ text: 'Perfil atualizado com sucesso.', kind: 'success' })
      } else {
        setMsg({ text: 'Perfil atualizado nesta sessão.', kind: 'info' })
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erro inesperado', kind: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const r = await authSignOut()
    if (r.error) setMsg({ text: r.error, kind: 'error' })
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PREFERÊNCIAS</div>
          <h1>Configurações</h1>
          <p>Dados do perfil e integrações do seu escritório.</p>
        </div>
      </div>
      {msg.text && <div className={`auth-msg auth-msg--${msg.kind}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}
      <section className="panel settings-panel">
        <h2>Perfil do corretor</h2>
        <p>Informações que serão usadas nos seus anúncios e contatos.</p>
        <form onSubmit={handleSave} className="form-grid">
          <label>Nome completo<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>E-mail<input type="email" value={email} readOnly /></label>
          <label>WhatsApp<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(DD) 99999-9999" /></label>
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar alterações'}</button>
        </form>
        {isSupabaseConfigured && user && <button className="btn secondary" style={{ marginTop: '8px', background: '#ef4444', borderColor: '#ef4444' }} onClick={handleLogout}>Sair da conta</button>}
      </section>
      <section className="panel settings-panel">
        <h2>Armazenamento local (100% gratuito)</h2>
        <p>Seus dados são salvos no navegador (localStorage), sem custo e sem servidor externo.</p>
        <span className="status available">Modo offline ativo</span>
        <p className="muted">Para limpar os dados, use a opção "Limpar dados do site" do navegador. Nenhuma conta ou chave de API é necessária.</p>
      </section>
      <section className="panel settings-panel">
        <h2>Assistente de IA (local)</h2>
        <p>Gere anúncios de imóveis e resumos de leads diretamente no navegador, sem custo e sem provedor externo.</p>
        <span className="status available">IA local ativa</span>
        <p className="muted">O texto é gerado por modelos locais de fallback. Nenhuma chave de API é enviada.</p>
      </section>
    </div>
  )
}
