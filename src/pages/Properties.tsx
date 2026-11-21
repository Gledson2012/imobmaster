import { useMemo, useState, useEffect } from 'react'
import { Plus, Search, SlidersHorizontal, MapPin, BedDouble, Bath, Maximize2, MoreHorizontal, Sparkles, Copy } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { dbPropertyToApp, appPropertyToDb, fetchProperties, createProperty, updateProperty, deleteProperty, isSupabaseConfigured } from '../lib/supabase'
import { generatePropertyCopy } from '../lib/ai'
import type { Property } from '../types'
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})

type PropertyForm = {
  title: string
  type: string
  purpose: 'Venda' | 'Aluguel'
  price: string
  city: string
  neighborhood: string
  bedrooms: string
  bathrooms: string
  area: string
}

function emptyForm(): PropertyForm {
  return { title:'', type:'Apartamento', purpose:'Venda', price:'', city:'Guarujá', neighborhood:'', bedrooms:'2', bathrooms:'1', area:'70' }
}

export default function Properties(){
  const [items,setItems]=useState<Property[]>([]); const [query,setQuery]=useState(''); const [modal,setModal]=useState(false)
  const [form,setForm]=useState<PropertyForm>(emptyForm()); const [loading,setLoading]=useState(false); const [editing,setEditing]=useState<string | null>(null)
  const { show } = useToast()
  const [copyGerado, setCopyGerado] = useState<{ propertyId: string; copy: string } | null>(null)
  const [gerandoCopy, setGerandoCopy] = useState<string | null>(null)

  useEffect(()=>{
    let mounted=true
    ;(async ()=>{
      setLoading(true)
      try{
        if(isSupabaseConfigured){
          const dbItems=await fetchProperties()
          setItems(dbItems.map(dbPropertyToApp))
        } else {
          const {demoProperties}=await import('../data/demo')
          if(mounted) setItems(demoProperties)
        }
      } catch(e){ console.error(e) } finally { if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted=false }
  },[])

  const filtered=useMemo(()=>items.filter(p=>(p.title+p.city+p.neighborhood+p.code).toLowerCase().includes(query.toLowerCase())),[items,query])

  const save=async ()=>{
    if(!form.title||!form.price)return
    setLoading(true)
    try{
      const payload: Omit<Property,'id'|'code'|'created_at'|'user_id'> = {
        title:form.title,
        type:form.type,
        purpose:form.purpose,
        price:Number(form.price),
        city:form.city,
        neighborhood:form.neighborhood,
        bedrooms:Number(form.bedrooms),
        bathrooms:Number(form.bathrooms),
        area:Number(form.area),
        status:'Disponível',
      }
      if(isSupabaseConfigured){
        if(editing){
          await updateProperty(editing, appPropertyToDb({...payload, id:editing} as Property))
          setItems(old=>old.map(p=>p.id===editing?{...p,...payload}:p))
        } else {
          const code=`IM-${Date.now().toString(36).toUpperCase()}`
          const created=await createProperty(appPropertyToDb({...payload, code} as Property))
          setItems([dbPropertyToApp(created),...items])
        }
        setEditing(null)
      } else {
        if(editing){
          setItems(old=>old.map(p=>p.id===editing?{...p,...payload}:p))
        } else {
          setItems(old=>[{id:crypto.randomUUID(),code:`IM-${String(old.length+1).padStart(3,'0')}`,...payload,status:'Disponível'},...old])
        }
        setForm(emptyForm())
      }
      setModal(false)
    } catch(e:any){ alert(e.message||'Erro ao salvar imóvel') } finally { setLoading(false) }
  }

  const remove=async (id:string)=>{
    if(!window.confirm('Excluir este imóvel?')) return
    setLoading(true)
    try{
      if(isSupabaseConfigured){
        await deleteProperty(id)
        setItems(old=>old.filter(p=>p.id!==id))
      } else {
        setItems(old=>old.filter(p=>p.id!==id))
      }
    } catch(e:any){ alert(e.message||'Erro ao excluir imóvel') } finally { setLoading(false) }
  }

  const edit=(p:Property)=>{
    setForm({title:p.title,type:p.type,purpose:p.purpose,price:String(p.price),city:p.city,neighborhood:p.neighborhood,bedrooms:String(p.bedrooms),bathrooms:String(p.bathrooms),area:String(p.area)})
    setEditing(p.id)
    setModal(true)
  }

  const gerarCopy = async (p: Property) => {
    if (!isSupabaseConfigured) {
      show('Configure o Supabase para usar a IA', 'error')
      return
    }
    setGerandoCopy(p.id)
    try {
      const { copy, source, error } = await generatePropertyCopy(p.id, 'profissional')
      if (error) {
        show(error, 'error')
        return
      }
      setCopyGerado({ propertyId: p.id, copy })
      show(`Copy gerado${source === 'ai' ? ' com IA' : ' (modo local)'}!`, 'success')
    } finally {
      setGerandoCopy(null)
    }
  }

  const copiarCopy = async () => {
    if (!copyGerado) return
    try {
      await navigator.clipboard.writeText(copyGerado.copy)
      show('Copy copiado para a área de transferência!', 'success')
    } catch {
      show('Não foi possível copiar automaticamente', 'error')
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CATÁLOGO IMOBILIÁRIO</div>
          <h1>Meus imóveis</h1>
          <p>Gerencie seus anúncios, captações e disponibilidade.</p>
        </div>
        <button className="btn primary" onClick={()=>{setForm(emptyForm());setEditing(null);setModal(true)}}>
          <Plus size={17}/> Cadastrar imóvel
        </button>
      </div>
      <div className="toolbar">
        <div className="input-search">
          <Search size={17}/>
          <input placeholder="Buscar por nome, bairro ou código..." value={query} onChange={e=>setQuery(e.target.value)}/>
        </div>
        <button className="btn secondary"><SlidersHorizontal size={16}/> Filtros</button>
        <span className="muted">{filtered.length} imóveis encontrados</span>
        {!isSupabaseConfigured&&<span className="muted" style={{marginLeft:'12px'}}>Modo demonstração (local)</span>}
      </div>
      <div className="properties-grid">
        {loading?<div style={{padding:'2rem',textAlign:'center',color:'#77839a'}}>Carregando...</div>:
        filtered.length===0?<div style={{padding:'2rem',textAlign:'center',color:'#77839a'}}>Nenhum imóvel encontrado</div>:
        filtered.map(p=>
          <article className="property-card" key={p.id}>
            <div className="property-image">
              <img src={p.image_url||'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900'} alt={p.title} />
              <span className={`status ${p.status==='Disponível'?'available':'pending'}`}>{p.status}</span>
              <button className="image-more"><MoreHorizontal/></button>
            </div>
            <div className="property-body">
              <div className="property-code">{p.code} · {p.purpose}</div>
              <h3>{p.title}</h3>
              <div className="location"><MapPin size={14}/>{p.neighborhood}, {p.city}</div>
              <div className="property-features">
                <span><BedDouble size={15}/>{p.bedrooms} quartos</span>
                <span><Bath size={15}/>{p.bathrooms} banheiros</span>
                <span><Maximize2 size={14}/>{p.area} m²</span>
              </div>
              <div className="property-price">{money(p.price)}{p.purpose==='Aluguel'&&<small>/mês</small>}</div>
              <div className="property-actions" style={{marginTop:'8px',display:'flex',gap:'8px'}}>
                <button className="btn secondary small" onClick={()=>edit(p)}>Editar</button>
                <button className="btn secondary small" style={{color:'#ef4444',borderColor:'#ef4444'}} onClick={()=>remove(p.id)}>Excluir</button>
                <button className="btn secondary small" onClick={()=>gerarCopy(p)} disabled={gerandoCopy===p.id}><Sparkles size={14}/> {gerandoCopy===p.id?'Gerando...':'IA'}</button>
              </div>
            </div>
          </article>
        )}
      </div>
      {modal&&(
        <Modal title={editing?'Editar imóvel':'Cadastrar novo imóvel'} onClose={()=>{setModal(false);setForm(emptyForm());setEditing(null)}}>
          <div className="form-grid">
            <label className="span-2">Título do anúncio
              <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex.: Apartamento com vista para o mar"/>
            </label>
            <label>Tipo
              <select required value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                <option>Apartamento</option><option>Casa</option><option>Terreno</option>
              </select>
            </label>
            <label>Finalidade
              <select required value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value as 'Venda'|'Aluguel'})}>
                <option>Venda</option><option>Aluguel</option>
              </select>
            </label>
            <label className="span-2">Preço (R$)
              <input required type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
            </label>
            <label>Cidade
              <input required value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/>
            </label>
            <label className="span-2">Bairro
              <input value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})}/>
            </label>
            <label>Quartos
              <input type="number" value={form.bedrooms} onChange={e=>setForm({...form,bedrooms:e.target.value})}/>
            </label>
            <label>Banheiros
              <input type="number" value={form.bathrooms} onChange={e=>setForm({...form,bathrooms:e.target.value})}/>
            </label>
            <label>Área (m²)
              <input type="number" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>{setModal(false);setForm(emptyForm());setEditing(null)}}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={loading}>{loading?'Salvando...':'Salvar imóvel'}</button>
          </div>
        </Modal>
      )}
      {copyGerado&&(
        <Modal title="Copy do anúncio" onClose={()=>setCopyGerado(null)}>
          <p style={{whiteSpace:'pre-wrap',lineHeight:1.6,margin:'0 0 1rem'}}>{copyGerado.copy}</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={()=>setCopyGerado(null)}>Fechar</button>
            <button className="btn primary" onClick={copiarCopy}><Copy size={15}/> Copiar texto</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
