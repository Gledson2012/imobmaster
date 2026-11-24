import { createContext, useContext, useState, type ReactNode } from 'react'

type Lang = 'pt' | 'en'

const dict: Record<Lang, Record<string, string>> = {
  pt: {
    'app.name': 'ImobMaster',
    'nav.dashboard': 'Visão geral',
    'nav.properties': 'Imóveis',
    'nav.clients': 'Clientes',
    'nav.leads': 'Leads',
    'nav.agenda': 'Agenda',
    'nav.finance': 'Financeiro',
    'nav.reports': 'Relatórios',
    'nav.settings': 'Configurações',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Carregando...',
    'common.export': 'Exportar',
    'common.new': 'Novo',
    'common.all': 'Todos',
    'page.dashboard': 'Visão geral',
    'page.properties': 'Meus imóveis',
    'page.clients': 'Clientes',
    'page.leads': 'Gestão de leads',
    'page.agenda': 'Agenda',
    'page.finance': 'Financeiro',
    'page.reports': 'Relatórios',
    'settings.title': 'Configurações',
    'settings.profile': 'Perfil do corretor',
    'settings.language': 'Idioma',
    'settings.lock': 'Bloqueio por senha',
    'settings.storage': 'Armazenamento local',
    'settings.backup': 'Backup dos dados (local)',
  },
  en: {
    'app.name': 'ImobMaster',
    'nav.dashboard': 'Overview',
    'nav.properties': 'Properties',
    'nav.clients': 'Clients',
    'nav.leads': 'Leads',
    'nav.agenda': 'Agenda',
    'nav.finance': 'Finance',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.export': 'Export',
    'common.new': 'New',
    'common.all': 'All',
    'page.dashboard': 'Overview',
    'page.properties': 'My properties',
    'page.clients': 'Clients',
    'page.leads': 'Lead management',
    'page.agenda': 'Agenda',
    'page.finance': 'Finance',
    'page.reports': 'Reports',
    'settings.title': 'Settings',
    'settings.profile': 'Realtor profile',
    'settings.language': 'Language',
    'settings.lock': 'Password lock',
    'settings.storage': 'Local storage',
    'settings.backup': 'Data backup (local)',
  },
}

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string } | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('imobmaster:lang') as Lang) || 'pt')
  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('imobmaster:lang', l)
  }
  const t = (k: string) => dict[lang][k] ?? k
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function useT() {
  return useI18n().t
}