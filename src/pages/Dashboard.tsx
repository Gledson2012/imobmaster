import { useState, useEffect } from 'react'
import { ArrowDownRight, ArrowUpRight, Building2, CalendarCheck, CircleDollarSign, Plus, Target, TrendingUp, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dbPropertyToApp, dbClientToApp, dbLeadToApp, dbAppointmentToApp, dbDealToApp, fetchProperties, fetchClients, fetchLeads, fetchAppointments, fetchDeals, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import type { Property, Client, Lead, Appointment, Deal } from '../types'

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
const chart=[{name:'Jan',v:28},{name:'Fev',v:36},{name:'Mar',v:31},{name:'Abr',v:48},{name:'Mai',v:42},{name:'Jun',v:64},{name:'Jul',v:54},{name:'Ago',v:76},{name:'Set',v:61},{name:'Out',v:82},{name:'Nov',v:72},{name:'Dez',v:90}]

export default function Dashboard(){
  const {user}=useAuth()
  const [props,setProps]=useState<Property[]>([])
  const [leads,setLeads]=useState<Lead[]>([])
  const [apps,setApps]=useState<Appointment[]>([])
  const [deals,setDeals]=useState<Deal[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let mounted=true
    ;(async ()=>{
      setLoading(true)
      try{
        if(isSupabaseConfigured){
          const [p,l,a,d]=await Promise.all([fetchProperties(),fetchLeads(),fetchAppointments(),fetchDeals()])
          setProps(p.map(dbPropertyToApp))
          setLeads(l.map(dbLeadToApp))
          setApps(a.map(dbAppointmentToApp))
          setDeals(d.map(dbDealToApp))
        } else {
          const {demoProperties,demoLeads,demoAppointments,demoDeals}=await import('../data/demo')
          if(mounted){setProps(demoProperties);setLeads(demoLeads);setApps(demoAppointments);setDeals(demoDeals)}
        }
      } catch(e){ console.error(e) } finally { if(mounted) setLoading(false) }
    })()
    return ()=>{mounted=false}
  },[])

  const stats=[
    {label:'Imóveis ativos',value:String(props.filter(p=>p.status==='Disponível').length),icon:Building2,color:'mint',trend:'up'},
    {label:'Leads no funil',value:String(leads.length),icon:Target,color:'purple',trend:'up'},
    {label:'Visitas este mês',value:String(apps.filter(a=>a.kind==='Visita').length),icon:CalendarCheck,color:'blue',trend:'up'},
    {label:'Comissões previstas',value:money(deals.reduce((s,d)=>s+d.value*d.commission_rate/100,0)),delta:'Meta 72%',icon:CircleDollarSign,color:'orange',trend:'down'},
  ]

  const today=new Date().toISOString().slice(0,10)
  const todayApps=apps.filter(a=>a.date===today)

  const dayNames=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
  const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const now=new Date()
  const dayLabel=`${dayNames[now.getDay()]}, ${now.getDate()} de ${monthNames[now.getMonth()]} de ${now.getFullYear()}`

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{dayLabel}</div>
          <h1>Bom dia, {user?.full_name?.split(' ')[0]||'Gledson'} <span>✦</span></h1>
          <p>Acompanhe o desempenho do seu negócio imobiliário.</p>
        </div>
        <Link className="btn primary" to="/imoveis"><Plus size={17}/> Novo imóvel</Link>
      </div>
      <div className="stats-grid">
        {stats.map(s=>
          <div className="stat-card" key={s.label}>
            <div className="stat-top"><span>{s.label}</span><div className={`stat-icon ${s.color}`}><s.icon size={19}/></div></div>
            <strong>{s.value}</strong>
            <div className="stat-foot"><span className="positive"><ArrowUpRight size={14}/>{s.delta||'+12,5%'}</span><span>vs. período anterior</span></div>
          </div>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><h2>Desempenho de vendas</h2><p>Volume de negócios ao longo do ano</p></div><select defaultValue="2026"><option>2026</option><option>2025</option></select></div>
          <div className="chart-total"><b>R$ 1.284.500</b><span className="positive"><TrendingUp size={14}/> 18,4%</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#273148"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#77839a',fontSize:11}}/><YAxis hide/><Tooltip contentStyle={{background:'#151e31',border:'1px solid #2a3650',borderRadius:10,color:'#fff'}} formatter={(v)=>[`${v}%`,'Desempenho']}/><Bar dataKey="v" fill="#65d6ad" radius={[5,5,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Próximos compromissos</h2><p>Sua agenda de hoje</p></div><Link to="/agenda" className="text-link">Ver agenda</Link></div>
          <div className="agenda-list">
            {loading?<div style={{padding:'1rem',color:'#77839a'}}>Carregando...</div>:
            todayApps.length===0?<div style={{padding:'1rem',color:'#77839a'}}>Sem compromissos para hoje</div>:
            todayApps.slice(0,3).map(a=>
              <div className="agenda-item" key={a.id}>
                <div className="agenda-time">{a.time}</div>
                <div className="agenda-line"/>
                <div><b>{a.title}</b><small>{a.client}</small><span className="tag">{a.kind}</span></div>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Imóveis recentes</h2><p>Últimos imóveis do seu catálogo</p></div><Link to="/imoveis" className="text-link">Ver todos</Link></div>
          <div className="property-mini-list">
            {loading?<div style={{padding:'1rem',color:'#77839a'}}>Carregando...</div>:
            props.slice(0,3).map(p=>
              <div className="property-mini" key={p.id}>
                <img src={p.image_url||''} alt={p.title}/>
                <div><b>{p.title}</b><small>{p.neighborhood}, {p.city} · {p.bedrooms} quartos</small><strong>{money(p.price)}</strong></div>
                <span className={`status ${p.status==='Disponível'?'available':'pending'}`}>{p.status}</span>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Leads recentes</h2><p>Oportunidades para acompanhar</p></div><Link to="/leads" className="text-link">Ver funil</Link></div>
          <div className="lead-list">
            {loading?<div style={{padding:'1rem',color:'#77839a'}}>Carregando...</div>:
            leads.map(l=>
              <div className="lead-row" key={l.id}>
                <div className="lead-avatar">{l.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
                <div><b>{l.name}</b><small>{l.source}</small></div>
                <span className="tag">{l.stage}</span>
              </div>
            )}
          </div>
        </section>
      </div>
      {!isSupabaseConfigured&&<p className="notice" style={{color:'#ef4444',marginTop:'1rem'}}>Configure o Supabase para persistir seus dados. Atualmente em modo demonstração (local).</p>}
    </div>
  )
}
