import { useState, useEffect } from 'react'
import { ArrowUpRight, CircleDollarSign, Download, Plus } from 'lucide-react'
import Modal from '../components/Modal'
import { dbDealToApp, appDealToDb, fetchDeals, createDeal, updateDeal, deleteDeal, isSupabaseConfigured } from '../lib/supabase'
import { localDateInput } from '../lib/dates'
import type { Deal } from '../types'

type DealForm = {
  property: string
  client: string
  value: string
  commission_rate: string
  status: string
  date: string
}

function emptyForm(): DealForm {
  return { property:'', client:'', value:'', commission_rate:'5', status:'Em andamento', date:localDateInput() }
}

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})

export default function Finance(){
  const [items,setItems]=useState<Deal[]>([]); const [modal,setModal]=useState(false)
  const [f,setF]=useState<DealForm>(emptyForm()); const [loading,setLoading]=useState(false); const [editing,setEditing]=useState<string | null>(null)

  useEffect(()=>{
    let mounted=true
    ;(async ()=>{
      setLoading(true)
      try{
        if(isSupabaseConfigured){
          const dbItems=await fetchDeals()
          setItems(dbItems.map(dbDealToApp))
        } else {
          const {demoDeals}=await import('../data/demo')
          if(mounted) setItems(demoDeals)
        }
      } catch(e){ console.error(e) } finally { if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted=false }
  },[])

  const expected=items.reduce((s,d)=>s+d.value*d.commission_rate/100,0)

  const save=async ()=>{
    if(!f.property||!f.client||!f.value)return
    setLoading(true)
    try{
      const fields={
        property:f.property,
        client:f.client,
        value:Number(f.value),
        commission_rate:Number(f.commission_rate)||5,
        status:f.status,
        date:f.date,
      }
      if(editing){
        // Merge com o negócio original: preserva notes, expected_at, received_at e FKs
        const original=items.find(d=>d.id===editing)
        const merged:Deal={...(original as Deal),...fields,id:editing}
        if(isSupabaseConfigured){
          await updateDeal(editing,appDealToDb(merged))
        }
        setItems(old=>old.map(d=>d.id===editing?merged:d))
        setEditing(null)
      } else {
        const payload:Omit<Deal,'id'|'created_at'|'user_id'>={...fields}
        if(isSupabaseConfigured){
          const created=await createDeal(appDealToDb(payload as Deal))
          setItems([dbDealToApp(created),...items])
        } else {
          setItems([{id:crypto.randomUUID(),...payload},...items])
        }
      }
      setF(emptyForm())
      setModal(false)
    } catch(e:any){ alert(e.message||'Erro ao salvar negócio') } finally { setLoading(false) }
  }

  const remove=async (id:string)=>{
    if(!window.confirm('Excluir este negócio?')) return
    setLoading(true)
    try{
      if(isSupabaseConfigured){
        await deleteDeal(id)
        setItems(old=>old.filter(d=>d.id!==id))
      } else {
        setItems(old=>old.filter(d=>d.id!==id))
      }
    } catch(e:any){ alert(e.message||'Erro ao excluir negócio') } finally { setLoading(false) }
  }

  const edit=(d:Deal)=>{
    setF({property:d.property,client:d.client,value:String(d.value),commission_rate:String(d.commission_rate),status:d.status,date:d.date})
    setEditing(d.id)
    setModal(true)
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROLE FINANCEIRO</div>
          <h1>Financeiro</h1>
          <p>Acompanhe suas comissões e previsões de recebimento.</p>
        </div>
        <button className="btn secondary" onClick={()=>{setF(emptyForm());setEditing(null);setModal(true)}}><Plus size={16}/> Nova negociação</button>
        <button className="btn secondary"><Download size={16}/> Exportar</button>
      </div>
      <div className="stats-grid three">
        <div className="stat-card"><div className="stat-top"><span>Comissões previstas</span><CircleDollarSign className="mint-text"/></div><strong>{money(expected)}</strong><div className="stat-foot">Em negociações ativas</div></div>
        <div className="stat-card"><div className="stat-top"><span>Recebido no mês</span><CircleDollarSign className="blue-text"/></div><strong>R$ 8.500</strong><div className="stat-foot"><span className="positive"><ArrowUpRight size={14}/> 12%</span> vs. mês anterior</div></div>
        <div className="stat-card"><div className="stat-top"><span>Meta mensal</span><CircleDollarSign className="purple-text"/></div><strong>72%</strong><div className="progress"><i style={{width:'72%'}}/></div><div className="stat-foot">R$ 18.000 de R$ 25.000</div></div>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>Negociações e comissões</h2><p>Estimativa calculada com a taxa cadastrada em cada negócio</p></div></div>
        <table>
          <thead><tr><th>IMÓVEL / NEGÓCIO</th><th>CLIENTE</th><th>VALOR</th><th>TAXA</th><th>COMISSÃO ESTIMADA</th><th>STATUS</th><th>AÇÕES</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#77839a'}}>Carregando...</td></tr>:
            items.length===0?<tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#77839a'}}>Nenhum negócio cadastrado</td></tr>:
            items.map(d=>
              <tr key={d.id}>
                <td><b>{d.property}</b></td>
                <td>{d.client}</td>
                <td>{money(d.value)}</td>
                <td>{d.commission_rate}%</td>
                <td><b className="mint-text">{money(d.value*d.commission_rate/100)}</b></td>
                <td><span className="status pending">{d.status}</span></td>
                <td>
                  <button className="action-link" onClick={()=>edit(d)}>Editar</button>
                  <button className="action-link" style={{color:'#ef4444'}} onClick={()=>remove(d.id)}>Excluir</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!isSupabaseConfigured&&<div style={{padding:'8px',color:'#77839a',fontSize:'13px'}}>Modo demonstração (local)</div>}
      </section>
      {modal&&(
        <Modal title={editing?'Editar negociação':'Nova negociação'} onClose={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>
          <div className="form-grid">
            <label className="span-2">Imóvel / negócio
              <input required value={f.property} onChange={e=>setF({...f,property:e.target.value})} placeholder="Ex.: Apartamento Astúrias"/>
            </label>
            <label className="span-2">Cliente
              <input required value={f.client} onChange={e=>setF({...f,client:e.target.value})} placeholder="Ex.: Mariana Oliveira"/>
            </label>
            <label>Valor (R$)
              <input required type="number" value={f.value} onChange={e=>setF({...f,value:e.target.value})}/>
            </label>
            <label>Taxa de comissão (%)
              <input type="number" value={f.commission_rate} onChange={e=>setF({...f,commission_rate:e.target.value})}/>
            </label>
            <label className="span-2">Status
              <select value={f.status} onChange={e=>setF({...f,status:e.target.value})}>
                <option>Em andamento</option><option>Proposta enviada</option><option>Fechado</option><option>Perdido</option>
              </select>
            </label>
            <label>Data
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>{setModal(false);setF(emptyForm());setEditing(null)}}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={loading}>{loading?'Salvando...':'Salvar negócio'}</button>
          </div>
        </Modal>
      )}
      <p className="notice">Os valores são estimativas de controle. Confirme taxas, contratos e datas de recebimento antes de considerar uma comissão como realizada.</p>
      {!isSupabaseConfigured&&<p className="notice" style={{color:'#ef4444'}}>Configure o Supabase para persistir seus dados.</p>}
    </div>
  )
}
