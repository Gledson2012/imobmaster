import { NavLink } from 'react-router-dom'
import { Building2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, ContactRound, LayoutDashboard, Settings, Target, X, LogOut } from 'lucide-react'

const links = [
  ['/', 'Visão geral', LayoutDashboard],
  ['/imoveis', 'Imóveis', Building2],
  ['/clientes', 'Clientes', ContactRound],
  ['/leads', 'Leads', Target],
  ['/agenda', 'Agenda', CalendarDays],
  ['/financeiro', 'Financeiro', CircleDollarSign],
  ['/relatorios', 'Relatórios', ChartNoAxesCombined],
] as const

export default function Sidebar({
  open,
  onClose,
  user,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  user: { full_name?: string; email: string } | null
  onLogout: () => void
}) {
  return (
    <>
      <div className={`sidebar-shade ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Building2 size={22} />
          </div>
          <div>
            <b>ImobMaster</b>
            <small>GESTÃO IMOBILIÁRIA</small>
          </div>
          <button className="mobile-close icon-btn" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="workspace">
          <div className="avatar">
            {user?.full_name?.charAt(0) || user?.email.charAt(0) || 'G'}
          </div>
          <div>
            <b>Meu escritório</b>
            <small>Corretor autônomo</small>
          </div>
          <span className="online-dot" />
        </div>
        <nav>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Leads' && <i>3</i>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/configuracoes" onClick={onClose}>
            <Settings size={18} /> Configurações
          </NavLink>
          {user && (
            <button className="sidebar-logout" onClick={onLogout}>
              <LogOut size={16} /> Sair
            </button>
          )}
          <div className="plan">
            <span>PLANO PROFISSIONAL</span>
            <b>Seu negócio, organizado.</b>
            <small>Gerencie seus imóveis e clientes em um só lugar.</small>
          </div>
        </div>
      </aside>
    </>
  )
}
