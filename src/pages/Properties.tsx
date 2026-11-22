import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, MapPin, BedDouble, Bath, Maximize2, Sparkles, Copy, Building2 } from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { EmptyState, LoadingState } from '../components/States'
import PropertyImage from '../components/PropertyImage'
import { useToast } from '../components/Toast'
import { dbPropertyToApp, appPropertyToDb, fetchProperties, createProperty, updateProperty, deleteProperty, uploadPropertyPhoto, deletePropertyPhoto, isStoragePath, isSupabaseConfigured } from '../lib/supabase'
import { generatePropertyCopy } from '../lib/ai'
import type { Property, PropertyStatus } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
const STATUSES: PropertyStatus[] = ['Disponível','Em negociação','Vendido','Alugado']

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
  status: PropertyStatus
  description: string
  address: string
  photo: File | null
}

function emptyForm(): PropertyForm {
  return { title:'', type:'Apartamento', purpose:'Venda', price:'', city:'Guarujá', neighborhood:'', bedrooms:'2', bathrooms:'1', area:'70', status:'Disponível', description:'', address:'', photo:null }
}

async function fetchPropertiesList(): Promise<Property[]> {
  if (isSupabaseConfigured) {
    const db = await fetchProperties()
    return db.map(dbPropertyToApp)
  }
  const { demoProperties } = await import('../data/demo')
  return demoProperties
}

export default function Properties(){
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<PropertyForm>(emptyForm())
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { show } = useToast()
  const [copyGerado, setCopyGerado] = useState<{ propertyId: string; copy: string } | null>(null)
  const [gerandoCopy, setGerandoCopy] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const queryClient = useQueryClient()

  const setProperties = (updater: (old: Property[] | undefined) => Property[]) => {
    queryClient.setQueryData(['properties'] as const, updater)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchPropertiesList,
    initialData: [] as Property[],
  })

  const itemsRef = data ?? [] as Property[]
  const filtered = useMemo(() => itemsRef.filter(p =>
    (p.title+p.city+p.neighborhood+p.code).toLowerCase().includes(query.toLowerCase()) &&
    (statusFilter==='Todos'||p.status===statusFilter)
  ),[itemsRef, query, statusFilter])

  // Preview local da foto selecionada (demo ou antes do upload)
  const previewUrl = useMemo(() => form.photo ? URL.createObjectURL(form.photo) : null, [form.photo])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const save = async () => {
    if (!form.title.trim() || !form.price) { show('Informe o título e o preço do imóvel.', 'error'); return }
    setBusy(true)
    try {
      const fields = {
        title: form.title,
        type: form.type,
        purpose: form.purpose,
        price: Number(form.price),
        city: form.city,
        neighborhood: form.neighborhood,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area: Number(form.area),
        status: form.status,
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
      }
      if (editing) {
        const original = itemsRef.find(p => p.id === editing)
        let merged: Property = { ...(original as Property), ...fields, id: editing }
        if (isSupabaseConfigured) {
          await updateProperty(editing, appPropertyToDb(merged))
          if (form.photo) {
            const path = await uploadPropertyPhoto(editing, form.photo)
            if (original?.image_url && isStoragePath(original.image_url)) {
              deletePropertyPhoto(original.image_url).catch(() => {})
            }
            await updateProperty(editing, { image_url: path })
            merged = { ...merged, image_url: path }
          }
        } else if (form.photo && previewUrl) {
          merged = { ...merged, image_url: previewUrl }
        }
        setProperties(old => old?.map(p => p.id === editing ? merged : p) ?? [])
        setEditing(null)
      } else {
        const payload: Omit<Property, 'id' | 'code' | 'created_at' | 'user_id'> = { ...fields }
        if (isSupabaseConfigured) {
          const code = `IM-${Date.now().toString(36).toUpperCase()}`
          let created = await createProperty(appPropertyToDb({ ...payload, code } as Property))
          if (form.photo) {
            const path = await uploadPropertyPhoto(created.id, form.photo)
            await updateProperty(created.id, { image_url: path })
            created = { ...created, image_url: path }
          }
          setProperties(old => [dbPropertyToApp(created), ...(old ?? [])])
        } else {
          const demoPhoto = form.photo && previewUrl ? { image_url: previewUrl } : {}
          setProperties(old => [{ id: crypto.randomUUID(), code: `IM-${String((old ?? []).length + 1).padStart(3, '0')}`, ...payload, ...demoPhoto }, ...(old ?? [])])
        }
      }
      setForm(emptyForm())
      setModal(false)
      show(editing ? 'Imóvel atualizado com sucesso.' : 'Imóvel cadastrado com sucesso.', 'success')
    } catch (e: any) {
      show(e.message || 'Erro ao salvar imóvel', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    const item = itemsRef.find(x => x.id === id)
    setBusy(true)
    try {
      if (isSupabaseConfigured) {
        await deleteProperty(id)
        if (item?.image_url && isStoragePath(item.image_url)) {
          deletePropertyPhoto(item.image_url).catch(() => {})
        }
        setProperties(old => old?.filter(p => p.id !== id) ?? [])
      } else {
        setProperties(old => old?.filter(p => p.id !== id) ?? [])
      }
      setConfirmId(null)
      if (item) {
        show(`“${item.title}” excluído.`, 'info', {
          label: 'Desfazer',
          onClick: () => undoDelete(item),
        })
      } else {
        show('Nada para desfazer.', 'info')
      }
    } catch (e: any) {
      show(e.message || 'Erro ao excluir imóvel', 'error')
    } finally {
      setBusy(false)
    }
  }

  const undoDelete = (item: Property) => {
    const dbPayload = appPropertyToDb(item)
    setProperties(old => [item, ...(old ?? [])])
    setProperties(old => [item, ...(old ?? [])])
    createProperty({ ...dbPayload, image_url: null }).catch(() => {})
    setConfirmId(null)
    show('Restaurado com sucesso.', 'success')
  }

  const edit = (p: Property) => {
    setForm({ title: p.title, type: p.type, purpose: p.purpose, price: String(p.price), city: p.city, neighborhood: p.neighborhood, bedrooms: String(p.bedrooms), bathrooms: String(p.bathrooms), area: String(p.area), status: p.status, description: p.description || '', address: p.address || '', photo: null })
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

  const editingItem = editing ? itemsRef.find(p => p.id === editing) : undefined

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CATÁLOGO IMOBILIÁRIO</div>
          <h1>Meus imóveis</h1>
          <p>Gerencie seus anúncios, captações e disponibilidade.</p>
        </div>
        <button className="btn primary" onClick={() => { setForm(emptyForm()); setEditing(null); setModal(true) }}>
          <Plus size={17} /> Cadastrar imóvel
        </button>
      </div>
      <div className="toolbar">
        <div className="input-search">
          <Search size={17} />
          <input placeholder="Buscar por nome, bairro ou código..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="filter-select" aria-label="Filtrar imóveis por status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['Todos', ...STATUSES].map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="muted">{filtered.length} imóveis encontrados</span>
        {!isSupabaseConfigured && <span className="muted" style={{ marginLeft: '12px' }}>Modo demonstração (local)</span>}
      </div>
      <div className="properties-grid">
        {isLoading ? <LoadingState /> :
        filtered.length === 0 ? <EmptyState
          icon={Building2}
          title={itemsRef.length === 0 ? 'Nenhum imóvel cadastrado' : 'Nenhum imóvel encontrado'}
          description={itemsRef.length === 0 ? 'Cadastre seu primeiro anúncio para começar a organizar seu catálogo.' : 'Tente outra busca ou remova o filtro de status.'}
          action={itemsRef.length === 0 && <button className="btn primary" onClick={() => { setForm(emptyForm()); setEditing(null); setModal(true) }}><Plus size={16} /> Cadastrar imóvel</button>}
        /> : filtered.map(p => (
          <article className="property-card" key={p.id}>
            <div className="property-image">
              <PropertyImage src={p.image_url} alt={p.title} />
              <span className={`status ${p.status === 'Disponível' ? 'available' : 'pending'}`}>{p.status}</span>
            </div>
            <div className="property-body">
              <div className="property-code">{p.code} · {p.purpose}</div>
              <h3>{p.title}</h3>
              <div className="location"><MapPin size={14} />{p.neighborhood}, {p.city}</div>
              <div className="property-features">
                <span><BedDouble size={15} />{p.bedrooms} quartos</span>
                <span><Bath size={15} />{p.bathrooms} banheiros</span>
                <span><Maximize2 size={14} />{p.area} m²</span>
              </div>
              <div className="property-price">{money(p.price)}{p.purpose === 'Aluguel' && <small>/mês</small>}</div>
              <div className="property-actions" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button className="btn secondary small" onClick={() => edit(p)}>Editar</button>
                <button className="btn secondary small" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setConfirmId(p.id)}>Excluir</button>
                <button className="btn secondary small" onClick={() => gerarCopy(p)} disabled={gerandoCopy === p.id}><Sparkles size={14} /> {gerandoCopy === p.id ? 'Gerando...' : 'IA'}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {modal && (
        <Modal title={editing ? 'Editar imóvel' : 'Cadastrar novo imóvel'} onClose={() => { setModal(false); setForm(emptyForm()); setEditing(null) }}>
          <div className="form-grid">
            <label className="span-2">Título do anúncio
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Apartamento com vista para o mar" />
            </label>
            <label>Tipo
              <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Apartamento</option><option>Casa</option><option>Terreno</option><option>Studio</option><option>Comercial</option>
              </select>
            </label>
            <label>Finalidade
              <select required value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value as 'Venda' | 'Aluguel' })}>
                <option>Venda</option><option>Aluguel</option>
              </select>
            </label>
            <label className="span-2">Preço (R$)
              <input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </label>
            <label>Cidade
              <input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </label>
            <label>Status
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as PropertyStatus })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="span-2">Bairro
              <input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} />
            </label>
            <label className="span-2">Endereço
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, complemento" />
            </label>
            <label>Quartos
              <input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} />
            </label>
            <label>Banheiros
              <input type="number" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} />
            </label>
            <label>Área (m²)
              <input type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
            </label>
            <label className="span-2">Descrição
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Destaques do imóvel para o anúncio" />
            </label>
            <label className="span-2">Foto do imóvel
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, photo: e.target.files?.[0] ?? null })} />
              {(previewUrl || editingItem?.image_url) && (
                <span style={{ display: 'block', marginTop: '8px' }}>
                  {previewUrl
                    ? <img src={previewUrl} alt="Preview da foto" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'cover' }} />
                    : <PropertyImage src={editingItem?.image_url} alt={editingItem?.title || 'Foto atual'} style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'cover' }} />}
                </span>
              )}
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => { setModal(false); setForm(emptyForm()); setEditing(null) }}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar imóvel'}</button>
          </div>
        </Modal>
      )}
      {copyGerado && (
        <Modal title="Copy do anúncio" onClose={() => setCopyGerado(null)}>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '0 0 1rem' }}>{copyGerado.copy}</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setCopyGerado(null)}>Fechar</button>
            <button className="btn primary" onClick={copiarCopy}><Copy size={15} /> Copiar texto</button>
          </div>
        </Modal>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Excluir imóvel"
          message={`Tem certeza que deseja excluir “${itemsRef.find(p => p.id === confirmId)?.title || 'este imóvel'}”? Esta ação não pode ser desfeita.`}
          busy={busy}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
