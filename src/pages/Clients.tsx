import { useState, useEffect } from 'react'
import { Plus, Search, Phone, Mail, MessageCircle } from 'lucide-react'
import Modal from '../components/Modal'
import { dbClientToApp, appClientToDb, fetchClients, createClient, updateClient, deleteClient, isSupabaseConfigured } from '../lib/supabase'
import type { Client } from '../types'

type ClientForm = {
  name: string
  email: string
  phone: string
  interest: string
  budget: string
}

function emptyForm(): ClientForm {
  return { name:'', email:'', phone:'', interest:'', budget:'' }
}

export default function Clients(){
  const [items,setItems]=useState<Client[]>([]); const [q,setQ]=useState(''); const [modal,setModal]=useState(false)
  const [f,setF]=useState<ClientForm>(emptyForm()); const [loading,setLoading]=useState(false); const [editing,setEditing]=useState<string | null>(null)

  useEffect(()=>{
    let mounted=true
    ;(async ()=>{
      setLoading(true)
      try{
        if(isSupabaseConfigured){
          const dbItems=await fetchClients()
          setItems(dbItems.map(dbClientToApp))
        } else {
          const {demoClients}=await import('../data/demo')
          if(mounted) setItems(demoClients)
        }
      } catch(e){ console.error(e) } finally { if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted=false }
  },[])

  const filtered=items.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()))

  const save=async ()=>{
    if(!f.name)return
    setLoading(true)
    try{
      const payload: Omit<Client,'id'|'created_at'|'user_id'> = {name:f.name,email:f.email,phone:f.phone,interest:f.interest,budget:Number(f.budget)||0}
      if(isSupabaseConfigured){
        if(editing){
          await updateClient(editing, appClientToDb({...payload, id:editing} as Client))
          setItems(old=>old.map(c=>c.id===editing?{...c,...payload}:c))
        } else {
          const created=await createClient(appClientToDb(payload as Client))
          setItems([dbClientToApp(created),...items])
        }
        setEditing(null)
      } else {
        if(editing){
          setItems(old=>old.map(c=>c.id===editing?{...c,...payload}:c))
        } else {
          setItems([{id:crypto.randomUUID(),...payload},...items])
        }
        setF(emptyForm())
      }
      setModal(false)
    } catch(e:any){ alert(e.message||'Erro ao salvar cliente') } finally { setLoading(false) }
  }

  const remove=async (id:string)=>{
    if(!window.confirm('Excluir este cliente?')) return
    setLoading(true)
    try{
      if(isSupabaseConfigured){
        await deleteClient(id)
        setItems(old=>old.filter(c=>c.id!==id))
      } else {
        setItems(old=>old.filter(c=>c.id!==id))
      }
    } catch(e:any){ alert(e.message||'Erro ao excluir cliente') } finally { setLoading(false) }
  }

  const edit=(c:Client)=>{
    setF({name:c.name,email:c.email,phone:c.phone,interest:c.interest,budget:String(c.budget)})
    setEditing(c.id)
    setModal(true)
  }

  const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">RELACIONAMENTO</div>
          <h1>Clientes</h1>
          <p>Organize seus contatos e entenda o que cada cliente procura.</p>
        </div>
        <button className="btn primary" onClick={()=>{setF(emptyForm());setEditing(null);setModal(true)}}>
          <Plus size={17}/> Novo cliente
        </button>
      </div>
      <div className="toolbar">
        <div className="input-search">
          <Search size={17}/>
          <input placeholder="Buscar cliente..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <span className="muted">{filtered.length} clientes</span>
        {!isSupabaseConfigured&&<span className="muted" style={{marginLeft:'12px'}}>Modo demonstração (local)</span>}
      </div>
      <div className="panel table-panel">
        <table>
          <thead><tr><th>CLIENTE</th><th>CONTATO</th><th>INTERESSE</th><th>ORÇAMENTO</th><th>AÇÕES</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#77839a'}}>Carregando...</td></tr>:
            filtered.length===0?<tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#77839a'}}>Nenhum cliente encontrado</td></tr>:
            filtered.map(c=>
              <tr key={c.id}>
                <td>
                  <div className="table-person">
                    <div className="lead-avatar">{c.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
                    <b>{c.name}</b>
                  </div>
                </td>
                <td>
                  <span className="table-contact"><Mail size={13}/>{c.email}</span>
                  <span className="table-contact"><Phone size={13}/>{c.phone}</span>
                </td>
                <td>{c.interest}</td>
                <td><b>{money(c.budget)}</b></td>
                <td>
                  <a className="action-link" href={`https://wa.me/55${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp</a>
                  <button className="action-link" style={{color:'#ef4444',marginLeft:'12px'}} onClick={()=>remove(c.id)}>Excluir</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {modal&&(
        <Modal title={editing?'Editar cliente':'Adicionar cliente'} onClose={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>
          <div className="form-grid">
            <label className="span-2">Nome completo
              <input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
            </label>
            <label>E-mail
              <input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
            </label>
            <label>Telefone
              <input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
            </label>
            <label className="span-2">Interesse
              <input value={f.interest} onChange={e=>setF({...f,interest:e.target.value})}/>
            </label>
            <label>Orçamento (R$)
              <input type="number" value={f.budget} onChange={e=>setF({...f,budget:e.target.value})}/>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={loading}>{loading?'Salvando...':'Salvar cliente'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
