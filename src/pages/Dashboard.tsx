import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarCheck, CircleDollarSign, Plus, Target, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PropertyImage from '../components/PropertyImage'
import { EmptyState, LoadingState } from '../components/States'
import {
  dbPropertyToApp,
  dbLeadToApp,
  dbAppointmentToApp,
  dbDealToApp,
  fetchProperties,
  fetchLeads,
  fetchAppointments,
  fetchDeals,
  isSupabaseConfigured,
} from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { localDateInput } from '../lib/dates'
import type { Property, Lead, Appointment, Deal } from '../types'
import { useQuery } from '@tanstack/react-query'

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
const commission=(d:Deal)=>d.value*d.commission_rate/100
const ACTIVE_DEAL_STATUSES=['Em andamento','Proposta enviada']
const monthShort=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const dayNames=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

async function fetchDashboardData(): Promise<{
  properties: Property[]
  leads: Lead[]
  appointments: Appointment[]
  deals: Deal[]
}> {
  if (isSupabaseConfigured) {
    const [p, l, a, d] = await Promise.all([
      fetchProperties(),
      fetchLeads(),
      fetchAppointments(),
      fetchDeals(),
    ])
    return {
      properties: p.map(dbPropertyToApp),
      leads: l.map(dbLeadToApp),
      appointments: a.map(dbAppointmentToApp),
      deals: d.map(dbDealToApp),
    }
  }
  const mod = await import('../data/demo')
  return {
    properties: mod.demoProperties,
    leads: mod.demoLeads,
    appointments: mod.demoAppointments,
    deals: mod.demoDeals,
  }
}

export default function Dashboard(){
  const {user}=useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  })

  const props = data?.properties ?? []
  const leads = data?.leads ?? []
  const apps = data?.appointments ?? []
  const deals = data?.deals ?? []

  const now=new Date()
  const today=localDateInput(now)
  const monthNow=today.slice(0,7)

  const derived=useMemo(()=>{
    const activeProps=props.filter(p=>p.status==='Disponível').length
    const activeLeads=leads.filter(l=>l.stage!=='Fechado'&&l.stage!=='Perdido').length
    const closedLeads=leads.filter(l=>l.stage==='Fechado').length
    const lostLeads=leads.filter(l=>l.stage==='Perdido').length
    const visitsMonth=apps.filter(a=>a.kind==='Visita'&&a.date.startsWith(monthNow)).length
    const activeDeals=deals.filter(d=>ACTIVE_DEAL_STATUSES.includes(d.status))
    const expected=activeDeals.reduce((s,d)=>s+commission(d),0)
    const closedDeals=deals.filter(d=>d.status==='Fechado')
    const chart:{name:string;v:number}[]=[]
    for(let i=11;i>=0;i--){
      const m=new Date(now.getFullYear(),now.getMonth()-i,1)
      const key=localDateInput(m).slice(0,7)
      const v=closedDeals.filter(d=>(d.received_at??d.date).slice(0,7)===key).reduce((s,d)=>s+d.value,0)
      chart.push({name:monthShort[m.getMonth()],v})
    }
    const chartTotal=closedDeals.reduce((s,d)=>s+d.value,0)
    return {activeProps,activeLeads,closedLeads,lostLeads,visitsMonth,activeDeals,expected,closedDeals,chart,chartTotal}
  },[props,leads,apps,deals,monthNow])

  const stats=[
    {label:'Imóveis ativos',value:String(derived.activeProps),icon:Building2,color:'mint',foot:`${props.length} no catálogo`},
    {label:'Leads no funil',value:String(derived.activeLeads),icon:Target,color:'purple',foot:`${derived.closedLeads} fechados · ${derived.lostLeads} perdidos`},
    {label:'Visitas este mês',value:String(derived.visitsMonth),icon:CalendarCheck,color:'blue',foot:`${monthNames[now.getMonth()]} de ${now.getFullYear()}`},
    {label:'Comissões previstas',value:money(derived.expected),icon:CircleDollarSign,color:'orange',foot:`${derived.activeDeals.length} negociações ativas`},
  ]

  const todayApps=apps.filter(a=>a.date===today)
  const dayLabel=`${dayNames[now.getDay()]}, ${now.getDate()} de ${monthNames[now.getMonth()]} de ${now.getFullYear()}`
  const hour=now.getHours()
  const saudacao=hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite'

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{dayLabel}</div>
          <h1>{saudacao}, {user?.full_name?.split(' ')[0]||'corretor'} <span>✦</span></h1>
          <p>Acompanhe o desempenho do seu negócio imobiliário.</p>
        </div>
        <Link className="btn primary" to="/imoveis"><Plus size={17}/> Novo imóvel</Link>
      </div>
      <div className="stats-grid">
        {stats.map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-top"><span>{s.label}</span><div className={`stat-icon ${s.color}`}><s.icon size={19}/></div></div>
            <strong>{s.value}</strong>
            <div className="stat-foot"><span>{s.foot}</span></div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><h2>Desempenho de vendas</h2><p>Volume fechado nos últimos 12 meses</p></div></div>
          <div className="chart-total"><b>{money(derived.chartTotal)}</b><span className="positive"><TrendingUp size={14}/> {derived.closedDeals.length} negócios fechados</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={derived.chart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#273148"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#77839a',fontSize:11}}/><YAxis hide/><Tooltip contentStyle={{background:'#151e31',border:'1px solid #2a3650',borderRadius:10,color:'#fff'}} formatter={(v)=>[money(Number(v)),'Volume fechado']}/><Bar dataKey="v" fill="#65d6ad" radius={[5,5,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Próximos compromissos</h2><p>Sua agenda de hoje</p></div><Link to="/agenda" className="text-link">Ver agenda</Link></div>
          <div className="agenda-list">
            {isLoading?<LoadingState/>:
            todayApps.length===0?<EmptyState icon={CalendarCheck} title="Sem compromissos para hoje" description="Sua agenda está livre. Use o tempo para prospectar novos leads."/>:
            todayApps.slice(0,3).map(a=>(
              <div className="agenda-item" key={a.id}>
                <div className="agenda-time">{a.time}</div>
                <div className="agenda-line"/>
                <div><b>{a.title}</b><small>{a.client}</small><span className="tag">{a.kind}</span></div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Imóveis recentes</h2><p>Últimos imóveis do seu catálogo</p></div><Link to="/imoveis" className="text-link">Ver todos</Link></div>
          <div className="property-mini-list">
            {isLoading?<LoadingState/>:
            props.length===0?<EmptyState icon={Building2} title="Nenhum imóvel cadastrado" description="Cadastre um imóvel para começar a montar seu catálogo."/>:
            props.slice(0,3).map(p=>(
              <div className="property-mini" key={p.id}>
                <PropertyImage src={p.image_url} alt={p.title}/>
                <div><b>{p.title}</b><small>{p.neighborhood}, {p.city} · {p.bedrooms} quartos</small><strong>{money(p.price)}</strong></div>
                <span className={`status ${p.status==='Disponível'?'available':'pending'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Leads recentes</h2><p>Oportunidades para acompanhar</p></div><Link to="/leads" className="text-link">Ver funil</Link></div>
          <div className="lead-list">
            {isLoading?<LoadingState/>:
            leads.length===0?<EmptyState icon={Target} title="Nenhum lead cadastrado" description="Adicione oportunidades para acompanhar seu funil de vendas."/>:
            leads.slice(0,5).map(l=>(
              <div className="lead-row" key={l.id}>
                <div className="lead-avatar">{l.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
                <div><b>{l.name}</b><small>{l.source}</small></div>
                <span className="tag">{l.stage}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {!isSupabaseConfigured&&<p className="notice" style={{color:'#ef4444',marginTop:'1rem'}}>Configure o Supabase para persistir seus dados. Atualmente em modo demonstração (local).</p>}
    </div>
  )
}
