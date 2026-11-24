import { NavLink } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { Building2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, ContactRound, LayoutDashboard, Settings, Target, X, LogOut } from 'lucide-react'

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
  const { t } = useI18n()
  const links = [
    ['/', t('nav.dashboard'), LayoutDashboard],
    ['/imoveis', t('nav.properties'), Building2],
    ['/clientes', t('nav.clients'), ContactRound],
    ['/leads', t('nav.leads'), Target],
    ['/agenda', t('nav.agenda'), CalendarDays],
    ['/financeiro', t('nav.finance'), CircleDollarSign],
    ['/relatorios', t('nav.reports'), ChartNoAxesCombined],
  ] as const
  return (
    <>
      <div className={`sidebar-shade ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} id="app-sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Building2 size={22} />
          </div>
          <div>
            <b>ImobMaster</b>
            <small>GESTÃO IMOBILIÁRIA</small>
          </div>
          <button className="mobile-close icon-btn" onClick={onClose} aria-label="Fechar menu">
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
        <nav aria-label="Navegação principal">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/configuracoes" onClick={onClose}>
            <Settings size={18} /> {t('nav.settings')}
          </NavLink>
          {user && (
            <button className="sidebar-logout" onClick={onLogout} title="Sair da conta">
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
