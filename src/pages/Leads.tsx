import { useState, useEffect } from 'react'
import { Plus, Phone, MessageCircle, Sparkles, Copy } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { dbLeadToApp, appLeadToDb, fetchLeads, createLead, updateLead, deleteLead, isSupabaseConfigured } from '../lib/supabase'
import { leadSummary } from '../lib/ai'
import type { Lead } from '../types'

type LeadForm = {
  name: string
  phone: string
  source: string
  property: string
}

function emptyForm(): LeadForm {
  return { name:'', phone:'', source:'Instagram', property:'' }
}

const stages=['Novo','Em contato','Visita agendada','Proposta','Fechado','Perdido']

export default function Leads(){
  const [items,setItems]=useState<Lead[]>([]); const [modal,setModal]=useState(false)
  const [f,setF]=useState<LeadForm>(emptyForm()); const [loading,setLoading]=useState(false); const [editing,setEditing]=useState<string | null>(null)
  const { show } = useToast()
  const [resumo, setResumo] = useState<{ leadId: string; summary: string } | null>(null)
  const [gerandoResumo, setGerandoResumo] = useState<string | null>(null)

  useEffect(()=>{
    let mounted=true
    ;(async ()=>{
      setLoading(true)
      try{
        if(isSupabaseConfigured){
          const dbItems=await fetchLeads()
          setItems(dbItems.map(dbLeadToApp))
        } else {
          const {demoLeads}=await import('../data/demo')
          if(mounted) setItems(demoLeads)
        }
      } catch(e){ console.error(e) } finally { if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted=false }
  },[])

  const save=async ()=>{
    if(!f.name)return
    setLoading(true)
    try{
      const payload: Omit<Lead,'id'|'created_at'|'user_id'> = {name:f.name,phone:f.phone,source:f.source,stage:'Novo',property:f.property||null}
      if(isSupabaseConfigured){
        if(editing){
          await updateLead(editing, appLeadToDb({...payload, id:editing} as Lead))
          setItems(old=>old.map(l=>l.id===editing?{...l,...payload}:l))
        } else {
          const created=await createLead(appLeadToDb(payload as Lead))
          setItems([dbLeadToApp(created),...items])
        }
        setEditing(null)
      } else {
        if(editing){
          setItems(old=>old.map(l=>l.id===editing?{...l,...payload}:l))
        } else {
          setItems([{id:crypto.randomUUID(),...payload},...items])
        }
        setF(emptyForm())
      }
      setModal(false)
    } catch(e:any){ alert(e.message||'Erro ao salvar lead') } finally { setLoading(false) }
  }

  const remove=async (id:string)=>{
    if(!window.confirm('Excluir este lead?')) return
    setLoading(true)
    try{
      if(isSupabaseConfigured){
        await deleteLead(id)
        setItems(old=>old.filter(l=>l.id!==id))
      } else {
        setItems(old=>old.filter(l=>l.id!==id))
      }
    } catch(e:any){ alert(e.message||'Erro ao excluir lead') } finally { setLoading(false) }
  }

  const move=async (id:string,stage:string)=>{
    const anterior=items.find(l=>l.id===id)?.stage
    setItems(old=>old.map(l=>l.id===id?{...l,stage}:l))
    if(isSupabaseConfigured){
      try{
        await updateLead(id,{stage})
      }catch(e:any){
        setItems(old=>old.map(l=>l.id===id?{...l,stage:anterior??l.stage}:l))
        show(e.message||'Erro ao mover lead','error')
      }
    }
  }

  const edit=(l:Lead)=>{
    setF({name:l.name,phone:l.phone,source:l.source,property:l.property||''})
    setEditing(l.id)
    setModal(true)
  }

  const gerarResumo = async (l: Lead) => {
    if (!isSupabaseConfigured) {
      show('Configure o Supabase para usar a IA', 'error')
      return
    }
    setGerandoResumo(l.id)
    try {
      const { summary, source, error } = await leadSummary(l.id)
      if (error) {
        show(error, 'error')
        return
      }
      setResumo({ leadId: l.id, summary })
      show(`Resumo gerado${source === 'ai' ? ' com IA' : ' (modo local)'}!`, 'success')
    } finally {
      setGerandoResumo(null)
    }
  }

  const copiarResumo = async () => {
    if (!resumo) return
    try {
      await navigator.clipboard.writeText(resumo.summary)
      show('Resumo copiado para a área de transferência!', 'success')
    } catch {
      show('Não foi possível copiar automaticamente', 'error')
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PIPELINE COMERCIAL</div>
          <h1>Gestão de leads</h1>
          <p>Acompanhe cada oportunidade até o fechamento.</p>
        </div>
        <button className="btn primary" onClick={()=>{setF(emptyForm());setEditing(null);setModal(true)}}>
          <Plus size={17}/> Novo lead
        </button>
      </div>
      <div className="kanban">
        {stages.map((stage,i)=>
          <div className="kanban-col" key={stage}>
            <div className="kanban-head"><span><i className={`stage-dot s${i}`}/>{stage}</span><b>{items.filter(l=>l.stage===stage).length}</b></div>
            {loading?<div style={{padding:'1rem',color:'#77839a'}}>Carregando...</div>:
            items.filter(l=>l.stage===stage).map(l=>
              <article className="lead-card" key={l.id}>
                <div className="lead-card-top"><b>{l.name}</b><span>{l.source}</span></div>
                <p>{l.property||'Interesse não informado'}</p>
                <div className="lead-card-footer">
                  <a href={`https://wa.me/55${l.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/></a>
                  <a href={`tel:${l.phone}`}><Phone size={15}/></a>
                  <select aria-label="Mover lead" value={l.stage} onChange={e=>move(l.id,e.target.value)}>
                    {stages.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="action-link" title="Resumo com IA" disabled={gerandoResumo===l.id} onClick={()=>gerarResumo(l)}><Sparkles size={15}/></button>
                  <button className="action-link" style={{color:'#ef4444',marginLeft:'8px'}} onClick={()=>remove(l.id)}>Excluir</button>
                </div>
              </article>
            )}
            <button className="add-lead" onClick={()=>setModal(true)}><Plus size={14}/> Adicionar lead</button>
          </div>
        )}
      </div>
      {modal&&(
        <Modal title={editing?'Editar lead':'Cadastrar lead'} onClose={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>
          <div className="form-grid">
            <label className="span-2">Nome
              <input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
            </label>
            <label>Telefone
              <input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
            </label>
            <label>Origem
              <select value={f.source} onChange={e=>setF({...f,source:e.target.value})}>
                <option>Instagram</option><option>WhatsApp</option><option>Indicação</option><option>Portal imobiliário</option>
              </select>
            </label>
            <label className="span-2">Imóvel de interesse
              <input value={f.property} onChange={e=>setF({...f,property:e.target.value})}/>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={loading}>{loading?'Salvando...':'Salvar lead'}</button>
          </div>
        </Modal>
      )}
      {resumo&&(
        <Modal title="Resumo do lead" onClose={()=>setResumo(null)}>
          <p style={{whiteSpace:'pre-wrap',lineHeight:1.6,margin:'0 0 1rem'}}>{resumo.summary}</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>setResumo(null)}>Fechar</button>
            <button className="btn primary" onClick={copiarResumo}><Copy size={15}/> Copiar texto</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
