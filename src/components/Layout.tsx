import { Bell, LogOut, Menu, Search, User } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from './AuthProvider'
import { ToastProvider } from './Toast'

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

export default function Layout() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} user={user} onLogout={handleLogout} />
      <main className="main">
        <ToastProvider>
          <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="crumb">
            Workspace <span>/</span> <b>{titles[loc.pathname] || 'ImobMaster'}</b>
          </div>
          <div className="top-actions">
            <button className="search-trigger">
              <Search size={16} /> <span>Buscar...</span><kbd>⌘ K</kbd>
            </button>
            <button className="icon-btn notification">
              <Bell size={18} /><i />
            </button>
            <div className="top-avatar user-block">
              {user ? (
                <>
                  <div className="avatar-letter">{user.full_name?.charAt(0) || 'U'}</div>
                  <div className="user-info">
                    <div className="user-name">{user.full_name || user.email}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                  <button className="icon-btn logout-btn" title="Sair" onClick={handleLogout}>
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <button className="icon-btn login-btn" title="Entrar" onClick={() => (window.location.href = '/auth')}>
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
        </ToastProvider>
      </main>
    </div>
  )
}
