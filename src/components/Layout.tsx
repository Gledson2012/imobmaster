import {
  Bell, Building2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, ContactRound,
  LayoutDashboard, LogOut, Menu, Search, Settings, Target, User, ArrowRight,
} from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from './AuthProvider'
import { useI18n } from '../lib/i18n'
import Modal from './Modal'
import { ToastProvider, useToast } from './Toast'
import { fetchProperties, fetchClients, fetchLeads, fetchAppointments } from '../lib/supabase'
import { dbPropertyToApp, dbClientToApp, dbLeadToApp, dbAppointmentToApp } from '../lib/supabase'

function useModules() {
  const { t } = useI18n()
  return [
    ['/', t('nav.dashboard'), LayoutDashboard],
    ['/imoveis', t('nav.properties'), Building2],
    ['/clientes', t('nav.clients'), ContactRound],
    ['/leads', t('nav.leads'), Target],
    ['/agenda', t('nav.agenda'), CalendarDays],
    ['/financeiro', t('nav.finance'), CircleDollarSign],
    ['/relatorios', t('nav.reports'), ChartNoAxesCombined],
    ['/configuracoes', t('nav.settings'), Settings],
  ] as const
}

function useTitles() {
  const { t } = useI18n()
  return {
    '/': t('nav.dashboard'),
    '/imoveis': t('nav.properties'),
    '/clientes': t('nav.clients'),
    '/leads': t('nav.leads'),
    '/agenda': t('nav.agenda'),
    '/financeiro': t('nav.finance'),
    '/relatorios': t('nav.reports'),
    '/configuracoes': t('nav.settings'),
  } as Record<string, string>
}

function QuickSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const term = query.trim().toLowerCase()
  const modules = useModules()

  const [data, setData] = useState<{ properties: any[]; clients: any[]; leads: any[]; appointments: any[] }>({ properties: [], clients: [], leads: [], appointments: [] })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [p, c, l, a] = await Promise.all([fetchProperties(), fetchClients(), fetchLeads(), fetchAppointments()])
      if (mounted) setData({ properties: p.map(dbPropertyToApp), clients: c.map(dbClientToApp), leads: l.map(dbLeadToApp), appointments: a.map(dbAppointmentToApp) })
    })()
    return () => { mounted = false }
  }, [])

  const moduleResults = modules.filter(([to, label]) => !term || label.toLowerCase().includes(term) || to.includes(term))

  const propResults = term ? data.properties.filter(p => (p.title + p.city + p.neighborhood + p.code).toLowerCase().includes(term)).slice(0, 5) : []
  const clientResults = term ? data.clients.filter(c => c.name.toLowerCase().includes(term)).slice(0, 5) : []
  const leadResults = term ? data.leads.filter(l => l.name.toLowerCase().includes(term)).slice(0, 5) : []
  const apptResults = term ? data.appointments.filter(a => a.title.toLowerCase().includes(term) || a.client.toLowerCase().includes(term)).slice(0, 5) : []

  const go = (path: string) => { navigate(path); onClose() }

  return (
    <Modal title="Busca rápida" onClose={onClose}>
      <div className="input-search palette-search">
        <Search size={17} />
        <input
          autoFocus
          aria-label="Buscar"
          placeholder="Buscar módulos, imóveis, clientes, leads..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      <nav className="palette-list" aria-label="Resultados da busca">
        {moduleResults.length > 0 && (
          <>
            <div className="palette-group">Módulos</div>
            {moduleResults.map(([to, label, Icon]) => (
              <Link key={to} to={to} className="palette-item" onClick={onClose}>
                <Icon size={17} /><span>{label}</span><ArrowRight size={15} />
              </Link>
            ))}
          </>
        )}
        {propResults.length > 0 && (
          <>
            <div className="palette-group">Imóveis</div>
            {propResults.map(p => (
              <button key={p.id} className="palette-item" onClick={() => go('/imoveis')}>
                <Building2 size={17} /><span>{p.title} — {p.neighborhood}, {p.city}</span><ArrowRight size={15} />
              </button>
            ))}
          </>
        )}
        {clientResults.length > 0 && (
          <>
            <div className="palette-group">Clientes</div>
            {clientResults.map(c => (
              <button key={c.id} className="palette-item" onClick={() => go('/clientes')}>
                <ContactRound size={17} /><span>{c.name}</span><ArrowRight size={15} />
              </button>
            ))}
          </>
        )}
        {leadResults.length > 0 && (
          <>
            <div className="palette-group">Leads</div>
            {leadResults.map(l => (
              <button key={l.id} className="palette-item" onClick={() => go('/leads')}>
                <Target size={17} /><span>{l.name}</span><ArrowRight size={15} />
              </button>
            ))}
          </>
        )}
        {apptResults.length > 0 && (
          <>
            <div className="palette-group">Compromissos</div>
            {apptResults.map(a => (
              <button key={a.id} className="palette-item" onClick={() => go('/agenda')}>
                <CalendarDays size={17} /><span>{a.title} — {a.date} {a.time}</span><ArrowRight size={15} />
              </button>
            ))}
          </>
        )}
        {term && moduleResults.length === 0 && propResults.length === 0 && clientResults.length === 0 && leadResults.length === 0 && apptResults.length === 0 && (
          <p className="palette-empty">Nenhum resultado para “{query}”.</p>
        )}
      </nav>
    </Modal>
  )
}

function AppLayout() {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [onboardOpen, setOnboardOpen] = useState(() => !localStorage.getItem('imobmaster:onboarded'))
  const loc = useLocation()
  const titles = useTitles()
  const modules = useModules()
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
        {onboardOpen && (
          <Modal title="Bem-vindo ao ImobMaster" onClose={() => { localStorage.setItem('imobmaster:onboarded', '1'); setOnboardOpen(false) }}>
            <p style={{ lineHeight: 1.6 }}>Seu app 100% gratuito e offline. Dicas rápidas:</p>
            <ul style={{ lineHeight: 1.8, fontSize: '13px' }}>
              <li>Use <kbd>Ctrl+K</kbd> para busca rápida.</li>
              <li>Cadastre imóveis, clientes e leads — tudo salvo no navegador.</li>
              <li>Exporte um backup em Configurações para não perder dados.</li>
              <li>Use "Ver no mapa" para visualizar imóveis com coordenadas.</li>
            </ul>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => { localStorage.setItem('imobmaster:onboarded', '1'); setOnboardOpen(false) }}>Começar</button>
            </div>
          </Modal>
        )}
      </div>
  )
}

export default function Layout() {
  return <ToastProvider><AppLayout /></ToastProvider>
}
