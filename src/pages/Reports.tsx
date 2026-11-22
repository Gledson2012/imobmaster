import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { CircleDollarSign, Target } from 'lucide-react'
import { EmptyState, LoadingState } from '../components/States'
import { dbPropertyToApp, dbLeadToApp, dbDealToApp, fetchProperties, fetchLeads, fetchDeals, isSupabaseConfigured } from '../lib/supabase'
import { localDateInput } from '../lib/dates'
import type { Property, Lead, Deal } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const commission = (d: Deal) => d.value * d.commission_rate / 100
const monthShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const STAGES = ['Novo', 'Em contato', 'Visita agendada', 'Proposta', 'Fechado', 'Perdido']

async function fetchReportsData(): Promise<{ properties: Property[]; leads: Lead[]; deals: Deal[] }> {
  if (isSupabaseConfigured) {
    const [p, l, d] = await Promise.all([fetchProperties(), fetchLeads(), fetchDeals()])
    return {
      properties: p.map(dbPropertyToApp),
      leads: l.map(dbLeadToApp),
      deals: d.map(dbDealToApp),
    }
  }
  const { demoProperties, demoLeads, demoDeals } = await import('../data/demo')
  return { properties: demoProperties, leads: demoLeads, deals: demoDeals }
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReportsData,
    initialData: { properties: [], leads: [], deals: [] },
  })

  const props = data?.properties ?? []
  const leads = data?.leads ?? []
  const deals = data?.deals ?? []

  const derived = useMemo(() => {
    const now = new Date()
    const captacoes = []
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = localDateInput(m).slice(0, 7)
      const v = props.filter(p => p.created_at && localDateInput(new Date(p.created_at)).slice(0, 7) === key).length
      captacoes.push({ m: monthShort[m.getMonth()], v })
    }
    const totalLeads = leads.length
    const funil = STAGES.map(s => {
      const v = leads.filter(l => l.stage === s).length
      return { stage: s, v, pct: totalLeads ? Math.round(v / totalLeads * 100) : 0 }
    })
    const activeDeals = deals.filter(d => d.status === 'Em andamento' || d.status === 'Proposta enviada')
    const closedDeals = deals.filter(d => d.status === 'Fechado')
    const lostDeals = deals.filter(d => d.status === 'Perdido')
    const expected = activeDeals.reduce((s, d) => s + commission(d), 0)
    const received = closedDeals.reduce((s, d) => s + commission(d), 0)
    const conversion = totalLeads ? Math.round(leads.filter(l => l.stage === 'Fechado').length / totalLeads * 100) : 0
    return { captacoes, funil, totalLeads, activeDeals, closedDeals, lostDeals, expected, received, conversion }
  }, [props, leads, deals])

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">INTELIGÊNCIA COMERCIAL</div>
          <h1>Relatórios</h1>
          <p>Indicadores calculados a partir dos seus dados cadastrados.</p>
        </div>
      </div>
      <div className="stats-grid three">
        <div className="stat-card"><div className="stat-top"><span>Imóveis no catálogo</span></div><strong>{props.length}</strong><div className="stat-foot">{props.filter(p => p.status === 'Disponível').length} disponíveis</div></div>
        <div className="stat-card"><div className="stat-top"><span>Conversão do funil</span></div><strong>{derived.conversion}%</strong><div className="stat-foot">{leads.filter(l => l.stage === 'Fechado').length} de {derived.totalLeads} leads fechados</div></div>
        <div className="stat-card"><div className="stat-top"><span>Comissões recebidas</span></div><strong>{money(derived.received)}</strong><div className="stat-foot">{money(derived.expected)} previstas em {derived.activeDeals.length} ativas</div></div>
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><h2>Captações por mês</h2><p>Imóveis adicionados ao catálogo (últimos 6 meses)</p></div></div>
          <div className="chart-wrap tall">
            {isLoading ? <LoadingState /> :
            <ResponsiveContainer width="100%" height="100%"><BarChart data={derived.captacoes}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#273148" /><XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: '#77839a' }} /><Tooltip contentStyle={{ background: '#151e31', border: '1px solid #2a3650', borderRadius: 10 }} formatter={(v) => [Number(v), 'Captações']} /><Bar dataKey="v" fill="#65d6ad" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Resumo do funil</h2><p>Oportunidades por etapa</p></div></div>
          {isLoading ? <LoadingState /> :
          derived.totalLeads === 0 ? <EmptyState icon={Target} title="Nenhum lead cadastrado" description="O resumo do funil aparece quando houver oportunidades." /> :
          derived.funil.map(f => (
            <div className="metric-line" key={f.stage}>
              <div><span>{f.stage}</span><b>{f.v} · {f.pct}%</b></div>
              <div className="progress"><i style={{ width: `${f.pct}%` }} /></div>
            </div>
          ))}
        </section>
      </div>
      <section className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-heading"><div><h2>Negócios</h2><p>Situação das negociações cadastradas</p></div></div>
        {isLoading ? <LoadingState /> :
        deals.length === 0 ? <EmptyState icon={CircleDollarSign} title="Nenhum negócio cadastrado" description="Cadastre negociações para ver o resumo financeiro." /> :
        <div className="stats-grid three">
          <div className="stat-card"><div className="stat-top"><span>Em andamento</span></div><strong>{derived.activeDeals.length}</strong><div className="stat-foot">{money(derived.expected)} em comissões previstas</div></div>
          <div className="stat-card"><div className="stat-top"><span>Fechados</span></div><strong>{derived.closedDeals.length}</strong><div className="stat-foot">{money(derived.received)} em comissões</div></div>
          <div className="stat-card"><div className="stat-top"><span>Perdidos</span></div><strong>{derived.lostDeals.length}</strong><div className="stat-foot">de {deals.length} negócios no total</div></div>
        </div>}
      </section>
      {!isSupabaseConfigured && <p className="notice" style={{ color: '#ef4444', marginTop: '1rem' }}>Modo demonstração: indicadores calculados sobre dados de exemplo.</p>}
    </div>
  )
}
