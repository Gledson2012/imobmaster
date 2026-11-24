import { useMemo, useState, useEffect } from 'react'
import { isSupabaseConfigured, fetchProfile, updateProfile } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { useI18n } from '../lib/i18n'
import { setLockPassword, isLockEnabled } from '../lib/lock'
import { encryptBackup, decryptBackup } from '../lib/crypto'
import { signOut } from '../lib/auth'
import type { UserProfile } from '../types'
import { useQuery } from '@tanstack/react-query'

export default function Settings() {
  const { user, signOut: authSignOut } = useAuth()
  const { lang, setLang } = useI18n()
  const [name, setName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [lockEnabled, setLockEnabled] = useState(isLockEnabled())
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

  const storageUsage = () => {
    let bytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('imobmaster:')) {
        bytes += (localStorage.getItem(k) || '').length * 2
      }
    }
    const kb = (bytes / 1024).toFixed(1)
    return `${kb} KB usados (limite típico ~5 MB).`
  }

  const handleLogout = async () => {
    const r = await authSignOut()
    if (r.error) setMsg({ text: r.error, kind: 'error' })
  }

  const exportBackup = () => {
    const data: Record<string, string | null> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('imobmaster:')) data[k] = localStorage.getItem(k)
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `imobmaster-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ text: 'Backup exportado com sucesso.', kind: 'success' })
  }

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Record<string, string | null>
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith('imobmaster:')) {
          if (v == null) localStorage.removeItem(k)
          else localStorage.setItem(k, v)
        }
      })
      setMsg({ text: 'Backup restaurado. Recarregue a página.', kind: 'success' })
    } catch (err: any) {
      setMsg({ text: err?.message || 'Arquivo inválido', kind: 'error' })
    }
    e.target.value = ''
  }

  const exportEncrypted = async () => {
    const password = prompt('Digite uma senha para criptografar o backup:')
    if (!password) return
    const data: Record<string, string | null> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('imobmaster:')) data[k] = localStorage.getItem(k)
    }
    const encrypted = await encryptBackup(JSON.stringify(data), password)
    const blob = new Blob([encrypted], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `imobmaster-backup-encrypted-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ text: 'Backup criptografado exportado.', kind: 'success' })
  }

  const importEncrypted = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const password = prompt('Digite a senha do backup:')
    if (!password) { e.target.value = ''; return }
    try {
      const text = await file.text()
      const decrypted = await decryptBackup(text.trim(), password)
      const data = JSON.parse(decrypted) as Record<string, string | null>
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith('imobmaster:')) {
          if (v == null) localStorage.removeItem(k)
          else localStorage.setItem(k, v)
        }
      })
      setMsg({ text: 'Backup criptografado restaurado. Recarregue a página.', kind: 'success' })
    } catch (err: any) {
      setMsg({ text: 'Falha ao descriptografar: senha incorreta ou arquivo inválido.', kind: 'error' })
    }
    e.target.value = ''
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
      <section className="panel settings-panel">
        <h2>Bloqueio por senha</h2>
        <p>Proteja o acesso ao app com uma senha.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="btn secondary" onClick={async () => {
            const pwd = prompt(lockEnabled ? 'Nova senha (deixe vazio para remover):' : 'Defina uma senha:')
            if (pwd === null) return
            await setLockPassword(pwd || null)
            setLockEnabled(isLockEnabled())
            setMsg({ text: pwd ? 'Bloqueio ativado.' : 'Bloqueio removido.', kind: 'success' })
          }}>{lockEnabled ? 'Alterar/remover senha' : 'Ativar bloqueio'}</button>
          <span className={`status ${lockEnabled ? 'available' : 'pending'}`}>{lockEnabled ? 'Ativo' : 'Inativo'}</span>
        </div>
      </section>
      <section className="panel settings-panel">
        <h2>Idioma</h2>
        <p>Selecione o idioma da interface.</p>
        <select value={lang} onChange={e => setLang(e.target.value as 'pt' | 'en')} className="filter-select" style={{ marginTop: '8px' }}>
          <option value="pt">Português</option>
          <option value="en">English</option>
        </select>
      </section>
      <section className="panel settings-panel">
        <h2>Armazenamento local</h2>
        <p>Espaço usado pelos seus dados no navegador.</p>
        <p className="muted">{storageUsage()}</p>
      </section>
      <section className="panel settings-panel">
        <h2>Backup dos dados (local)</h2>
        <p>Exporte todos os seus dados para um arquivo JSON e restaure quando quiser.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="btn primary" onClick={exportBackup}>Exportar backup</button>
          <label className="btn secondary" style={{ cursor: 'pointer' }}>
            Importar backup
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importBackup} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="btn secondary" onClick={exportEncrypted}>Exportar backup criptografado</button>
          <label className="btn secondary" style={{ cursor: 'pointer' }}>
            Importar backup criptografado
            <input type="file" accept="text/plain" style={{ display: 'none' }} onChange={importEncrypted} />
          </label>
        </div>
      </section>
    </div>
  )
}
