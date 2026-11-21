import { useState, useEffect } from 'react'
import { CalendarDays, Clock, Plus } from 'lucide-react'
import Modal from '../components/Modal'
import { dbAppointmentToApp, appAppointmentToDb, fetchAppointments, createAppointment, updateAppointment, deleteAppointment, isSupabaseConfigured } from '../lib/supabase'
import type { Appointment } from '../types'

type AppointmentForm = {
  title: string
  client: string
  date: string
  time: string
  kind: string
}

function emptyForm(): AppointmentForm {
  return { title:'', client:'', date:new Date().toISOString().slice(0,10), time:'10:00', kind:'Visita' }
}

export default function Agenda(){
  const [items,setItems]=useState<Appointment[]>([]); const [modal,setModal]=useState(false)
  const [f,setF]=useState<AppointmentForm>(emptyForm()); const [loading,setLoading]=useState(false); const [editing,setEditing]=useState<string | null>(null)

  useEffect(()=>{
    let mounted=true
    ;(async ()=>{
      setLoading(true)
      try{
        if(isSupabaseConfigured){
          const dbItems=await fetchAppointments()
          setItems(dbItems.map(dbAppointmentToApp))
        } else {
          const {demoAppointments}=await import('../data/demo')
          if(mounted) setItems(demoAppointments)
        }
      } catch(e){ console.error(e) } finally { if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted=false }
  },[])

  const save=async ()=>{
    if(!f.title)return
    setLoading(true)
    try{
      const payload: Omit<Appointment,'id'|'created_at'|'user_id'> = {title:f.title,client:f.client,date:f.date,time:f.time,kind:f.kind as Appointment['kind']}
      if(isSupabaseConfigured){
        if(editing){
          await updateAppointment(editing, appAppointmentToDb({...payload, id:editing} as Appointment))
          setItems(old=>old.map(a=>a.id===editing?{...a,...payload}:a).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)))
        } else {
          const created=await createAppointment(appAppointmentToDb(payload as Appointment))
          setItems([dbAppointmentToApp(created),...items].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)))
        }
        setEditing(null)
      } else {
        if(editing){
          setItems(old=>old.map(a=>a.id===editing?{...a,...payload}:a).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)))
        } else {
          setItems([...items,{id:crypto.randomUUID(),...payload}].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)))
        }
        setF(emptyForm())
      }
      setModal(false)
    } catch(e:any){ alert(e.message||'Erro ao salvar compromisso') } finally { setLoading(false) }
  }

  const remove=async (id:string)=>{
    if(!window.confirm('Excluir este compromisso?')) return
    setLoading(true)
    try{
      if(isSupabaseConfigured){
        await deleteAppointment(id)
        setItems(old=>old.filter(a=>a.id!==id))
      } else {
        setItems(old=>old.filter(a=>a.id!==id))
      }
    } catch(e:any){ alert(e.message||'Erro ao excluir compromisso') } finally { setLoading(false) }
  }

  const edit=(a:Appointment)=>{
    setF({title:a.title,client:a.client,date:a.date,time:a.time,kind:a.kind})
    setEditing(a.id)
    setModal(true)
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ORGANIZAÇÃO</div>
          <h1>Agenda</h1>
          <p>Visitas, reuniões, captações e retornos comerciais.</p>
        </div>
        <button className="btn primary" onClick={()=>{setF(emptyForm());setEditing(null);setModal(true)}}>
          <Plus size={17}/> Novo compromisso
        </button>
      </div>
      <div className="panel calendar-panel">
        <div className="panel-heading"><div><h2>Próximos compromissos</h2><p>Organize sua rotina de atendimento</p></div><CalendarDays color="#65d6ad"/></div>
        {loading?<div style={{padding:'1rem',textAlign:'center',color:'#77839a'}}>Carregando...</div>:
        items.length===0?<div style={{padding:'1rem',textAlign:'center',color:'#77839a'}}>Nenhum compromisso agendado</div>:
        items.map(a=>
          <div className="appointment-row" key={a.id}>
            <div className="appointment-date"><b>{new Date(a.date+'T12:00:00').getDate()}</b><small>{new Date(a.date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).toUpperCase()}</small></div>
            <div className="appointment-info"><b>{a.title}</b><span>{a.client}</span><small><Clock size={13}/>{a.time} · {a.kind}</small></div>
            <div className="appointment-actions" style={{display:'flex',gap:'6px'}}>
              <button className="btn secondary small" onClick={()=>edit(a)}>Editar</button>
              <button className="btn secondary small" style={{color:'#ef4444',borderColor:'#ef4444'}} onClick={()=>remove(a.id)}>Excluir</button>
            </div>
            <span className="tag">{a.kind}</span>
          </div>
        )}
        {!isSupabaseConfigured&&<div style={{padding:'8px',color:'#77839a',fontSize:'13px'}}>Modo demonstração (local)</div>}
      </div>
      {modal&&(
        <Modal title={editing?'Editar compromisso':'Novo compromisso'} onClose={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>
          <div className="form-grid">
            <label className="span-2">Título
              <input required value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Ex.: Visita ao apartamento"/>
            </label>
            <label className="span-2">Cliente / contato
              <input value={f.client} onChange={e=>setF({...f,client:e.target.value})}/>
            </label>
            <label>Data
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
            </label>
            <label>Horário
              <input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
            </label>
            <label className="span-2">Tipo
              <select value={f.kind} onChange={e=>setF({...f,kind:e.target.value})}>
                <option>Visita</option><option>Follow-up</option><option>Captação</option><option>Reunião</option>
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={loading}>{loading?'Salvando...':'Salvar compromisso'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
