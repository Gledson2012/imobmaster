import {
  Bell, Building2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, ContactRound,
  LayoutDashboard, LogOut, Menu, Search, Settings, Target, User, ArrowRight,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from './AuthProvider'
import Modal from './Modal'
import { ToastProvider, useToast } from './Toast'

const titles: Record<string, string> = {
  '/': 'Visão geral',
  '/imoveis': 'Imóveis',
  '/clientes': 'Clientes',
  '/leads': 'Leads',
  '/agenda': 'Agenda',
  '/financeiro': 'Financeiro',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

const modules = [
  ['/', 'Visão geral', LayoutDashboard],
  ['/imoveis', 'Imóveis', Building2],
  ['/clientes', 'Clientes', ContactRound],
  ['/leads', 'Leads', Target],
  ['/agenda', 'Agenda', CalendarDays],
  ['/financeiro', 'Financeiro', CircleDollarSign],
  ['/relatorios', 'Relatórios', ChartNoAxesCombined],
  ['/configuracoes', 'Configurações', Settings],
] as const

function QuickSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const results = modules.filter(([to, label]) => label.toLowerCase().includes(term) || to.includes(term))

  return (
    <Modal title="Busca rápida" onClose={onClose}>
      <div className="input-search palette-search">
        <Search size={17} />
        <input
          aria-label="Buscar módulo"
          placeholder="Digite para ir a um módulo..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      <nav className="palette-list" aria-label="Módulos do sistema">
        {results.length === 0 ? (
          <p className="palette-empty">Nenhum módulo encontrado para “{query}”.</p>
        ) : results.map(([to, label, Icon]) => (
          <Link key={to} to={to} className="palette-item" onClick={onClose}>
            <Icon size={17} /><span>{label}</span><ArrowRight size={15} />
          </Link>
        ))}
      </nav>
    </Modal>
  )
}

function AppLayout() {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const loc = useLocation()
  const { user, signOut } = useAuth()
  const { show } = useToast()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(value => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    await signOut()
  }

  return (
      <div className="app-shell">
        <Sidebar open={open} onClose={() => setOpen(false)} user={user} onLogout={handleLogout} />
        <main className="main">
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} aria-controls="app-sidebar">
              <Menu />
            </button>
            <div className="crumb">
              Workspace <span>/</span> <b>{titles[loc.pathname] || 'ImobMaster'}</b>
            </div>
            <div className="top-actions">
              <button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Busca rápida (Ctrl+K)">
                <Search size={16} /> <span>Buscar...</span><kbd>⌘ K</kbd>
              </button>
              <button
                className="icon-btn notification"
                onClick={() => show('Nenhuma notificação nova no momento.', 'info')}
                aria-label="Notificações"
                title="Notificações"
              >
                <Bell size={18} />
              </button>
              <div className="top-avatar user-block">
                {user ? (
                  <>
                    <div className="avatar-letter">{user.full_name?.charAt(0) || 'U'}</div>
                    <div className="user-info">
                      <div className="user-name">{user.full_name || user.email}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    <button className="icon-btn logout-btn" title="Sair" aria-label="Sair da conta" onClick={handleLogout}>
                      <LogOut size={16} />
                    </button>
                  </>
                ) : (
                  <button className="icon-btn login-btn" title="Entrar" aria-label="Entrar" onClick={() => (window.location.href = '/auth')}>
                    <User size={16} />
                  </button>
                )}
              </div>
            </div>
          </header>
          <div className="page">
            <Outlet />
          </div>
          <footer className="footer">
            © 2026 ImobMaster <span>Gestão inteligente para corretores</span>
          </footer>
        </main>
        {searchOpen && <QuickSearch onClose={() => setSearchOpen(false)} />}
      </div>
  )
}

export default function Layout() {
  return <ToastProvider><AppLayout /></ToastProvider>
}
