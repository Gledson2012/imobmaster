import { useState, useEffect } from 'react'
import { isSupabaseConfigured, fetchProfile, updateProfile } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { signOut } from '../lib/auth'
import type { UserProfile } from '../types'

export default function Settings(){
  const {user, signOut: authSignOut}=useAuth()
  const [name,setName]=useState(user?.full_name||'')
  const [phone,setPhone]=useState('')
  const [email,setEmail]=useState(user?.email||'')
  const [loading,setLoading]=useState(false)
  const [msg,setMsg]=useState({text:'',kind:'info' as 'info'|'success'|'error'})

  useEffect(()=>{
    if(!isSupabaseConfigured||!user) return
    ;(async ()=>{
      const prof=await fetchProfile(user.id)
      if(prof){setName(prof.full_name);setPhone(prof.phone||'')}
    })()
  },[user])

  const handleSave=async (e:React.FormEvent)=>{
    e.preventDefault()
    setLoading(true)
    setMsg({text:'',kind:'info'})
    try{
      if(isSupabaseConfigured&&user){
        const r=await updateProfile(user.id,{full_name:name,phone:phone})
        if(r.error) setMsg({text:r.error,kind:'error'})
        else setMsg({text:'Perfil atualizado com sucesso.',kind:'success'})
      } else {
        setMsg({text:'Perfil de demonstração atualizado nesta sessão.',kind:'info'})
      }
    } catch(err:any){ setMsg({text:err.message||'Erro inesperado',kind:'error'}) } finally { setLoading(false) }
  }

  const handleLogout=async ()=>{
    const r=await authSignOut()
    if(r.error) setMsg({text:r.error,kind:'error'})
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PREFERÊNCIAS</div>
          <h1>Configurações</h1>
          <p>Dados do perfil e integrações do seu escritório.</p>
        </div>
      </div>
      {msg.text&&<div className={`auth-msg auth-msg--${msg.kind}`} style={{marginBottom:'1rem'}}>{msg.text}</div>}
      <section className="panel settings-panel">
        <h2>Perfil do corretor</h2>
        <p>Informações que serão usadas nos seus anúncios e contatos.</p>
        <form onSubmit={handleSave} className="form-grid">
          <label>Nome completo<input required value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>E-mail<input type="email" value={email} readOnly/></label>
          <label>WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(DD) 99999-9999"/></label>
          <button className="btn primary" type="submit" disabled={loading}>{loading?'Salvando...':'Salvar alterações'}</button>
        </form>
        {isSupabaseConfigured&&user&&<button className="btn secondary" style={{marginTop:'8px',background:'#ef4444',borderColor:'#ef4444'}} onClick={handleLogout}>Sair da conta</button>}
      </section>
      <section className="panel settings-panel">
        <h2>Conexão com Supabase</h2>
        <p>Banco de dados e autenticação do ImobMaster.</p>
        <span className={`status ${isSupabaseConfigured?'available':'pending'}`}>{isSupabaseConfigured?'Variáveis configuradas':'Aguardando configuração'}</span>
        <p className="muted">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env. Consulte o README para executar o SQL e habilitar a persistência.</p>
      </section>
      <section className="panel settings-panel">
        <h2>Assistente de IA</h2>
        <p>Gere anúncios de imóveis e resumos de leads pelas Edge Functions do Supabase. Sem provedor de IA configurado, o texto é gerado localmente no servidor (fallback).</p>
        <span className={`status ${isSupabaseConfigured?'available':'pending'}`}>{isSupabaseConfigured?'Funções disponíveis no projeto':'Aguardando configuração do Supabase'}</span>
        <p className="muted">Deploy: <code>supabase functions deploy generate-property-copy lead-summary</code>. Para IA real, configure os secrets <code>AI_API_KEY</code> e <code>VITE_AI_ENDPOINT</code> no projeto Supabase.</p>
      </section>
    </div>
  )
}
