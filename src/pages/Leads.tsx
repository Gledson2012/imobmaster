import { useMemo, useState } from 'react'
import { Plus, Phone, MessageCircle, Sparkles, Copy, Pencil, Target } from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { EmptyState, LoadingState } from '../components/States'
import { useToast } from '../components/Toast'
import { dbLeadToApp, appLeadToDb, fetchLeads, createLead, updateLead, deleteLead, isSupabaseConfigured } from '../lib/supabase'
import { leadSummary } from '../lib/ai'
import type { Lead } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, useSensor, PointerSensor, type DragEndEvent } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type LeadForm = {
  name: string
  phone: string
  source: string
  property: string
}

function emptyForm(): LeadForm {
  return { name: '', phone: '', source: 'Instagram', property: '' }
}

const stages = ['Novo', 'Em contato', 'Visita agendada', 'Proposta', 'Fechado', 'Perdido']

async function fetchLeadsList(): Promise<Lead[]> {
  if (isSupabaseConfigured) {
    const db = await fetchLeads()
    return db.map(dbLeadToApp)
  }
  const { demoLeads } = await import('../data/demo')
  return demoLeads
}

export default function Leads() {
  const [items, setItems] = useState<Lead[]>([])
  const [modal, setModal] = useState(false)
  const [f, setF] = useState<LeadForm>(emptyForm())
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [resumo, setResumo] = useState<{ leadId: string; summary: string } | null>(null)
  const [gerandoResumo, setGerandoResumo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { show } = useToast()
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeadsList,
    initialData: [] as Lead[],
  })

  const itemsRef = data ?? []
  const setLeads = (updater: (old: Lead[] | undefined) => Lead[]) => {
    queryClient.setQueryData(['leads'] as const, updater)
  }

  const save = async () => {
    if (!f.name.trim() || !f.phone.trim()) { show('Informe o nome e o telefone do lead.', 'error'); return }
    setBusy(true)
    try {
      const fields = { name: f.name, phone: f.phone, source: f.source, property: f.property || null }
      if (editing) {
        const original = itemsRef.find(l => l.id === editing)
        const merged: Lead = { ...(original as Lead), ...fields, id: editing }
        if (isSupabaseConfigured) {
          await updateLead(editing, appLeadToDb(merged))
        }
        setLeads(old => old?.map(l => l.id === editing ? merged : l) ?? [])
        setEditing(null)
      } else {
        const payload: Omit<Lead, 'id' | 'created_at' | 'user_id'> = { ...fields, stage: 'Novo' }
        if (isSupabaseConfigured) {
          const created = await createLead(appLeadToDb(payload as Lead))
          setItems(old => [dbLeadToApp(created), ...old])
          setLeads(old => [dbLeadToApp(created), ...(old ?? [])])
        } else {
          setItems(old => [{ id: crypto.randomUUID(), ...payload }, ...old])
          setLeads(old => [{ id: crypto.randomUUID(), ...payload }, ...(old ?? [])])
        }
      }
      setF(emptyForm())
      setModal(false)
      show(editing ? 'Lead atualizado com sucesso.' : 'Lead cadastrado com sucesso.', 'success')
    } catch (e: any) {
      show(e.message || 'Erro ao salvar lead', 'error')
    } finally {
      setBusy(false)
    }
  }

    const remove = async (id: string) => {
    const item = itemsRef.find(l => l.id === id)
    setBusy(true)
    try {
      if (isSupabaseConfigured) {
        await deleteLead(id)
        setLeads(old => old?.filter(l => l.id !== id) ?? [])
      } else {
        setLeads(old => old?.filter(l => l.id !== id) ?? [])
      }
      setConfirmId(null)
      if (item) {
        show(`“${item.name}” excluído.`, 'info', { label: 'Desfazer', onClick: () => undoDelete(item) })
      } else {
        show('Nada para desfazer.', 'info')
      }
    } catch (e: any) {
      show(e.message || 'Erro ao excluir lead', 'error')
    } finally {
      setBusy(false)
    }
  }

  const move = async (id: string, stage: string) => {
    const anterior = itemsRef.find(l => l.id === id)?.stage
    setItems(old => old.map(l => l.id === id ? { ...l, stage } : l))
    setLeads(old => old?.map(l => l.id === id ? { ...l, stage } : l) ?? [])
    if (isSupabaseConfigured) {
      try {
        await updateLead(id, { stage })
        show(`Lead movido para “${stage}”.`, 'success')
      } catch (e: any) {
        setItems(old => old.map(l => l.id === id ? { ...l, stage: anterior ?? l.stage } : l))
        setLeads(old => old?.map(l => l.id === id ? { ...l, stage: anterior ?? l.stage } : l) ?? [])
        show(e.message || 'Erro ao mover lead', 'error')
      }
    }
  }

  const dragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (active.id === over?.id) return
    const targetStage = stages.find(stage =>
      itemByStage(stage).some(l => l.id === over?.id)
    )
    if (!targetStage) return
    const targetLeads = itemByStage(targetStage)
    const from = targetLeads.findIndex(l => l.id === active.id)
    const to = targetLeads.findIndex(l => l.id === over?.id)
    if (from === -1 || to === -1) return
    const reordered = arrayMove(targetLeads, from, to)
    setLeads(old => {
      if (!old) return []
      const map = new Map<string, Lead>()
      reordered.forEach((l, i) => { map.set(l.id, l) })
      return old.map(l => map.get(l.id) ?? l)
    })
    setItems(old => {
      if (!old) return []
      const map = new Map<string, Lead>()
      reordered.forEach((l, i) => { map.set(l.id, l) })
      return old.map(l => map.get(l.id) ?? l)
    })
  }

  const undoDelete = (item: Lead) => {
    const dbPayload = appLeadToDb(item)
    setLeads(old => [item, ...(old ?? [])])
    setItems(old => [item, ...old])
    createLead(dbPayload).catch(() => {})
    setConfirmId(null)
    show('Restaurado com sucesso.', 'success')
  }

const edit = (l: Lead) => {
    setF({ name: l.name, phone: l.phone, source: l.source, property: l.property || '' })
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

  const itemByStage = (stage: string) => itemsRef.filter(l => l.stage === stage)

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PIPELINE COMERCIAL</div>
          <h1>Gestão de leads</h1>
          <p>Acompanhe cada oportunidade até o fechamento.</p>
        </div>
        <button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}>
          <Plus size={17} /> Novo lead
        </button>
      </div>
      {isLoading ? <div className="panel"><LoadingState /></div> :
      itemsRef.length === 0 ? <EmptyState
        icon={Target}
        title="Nenhum lead cadastrado"
        description="Adicione sua primeira oportunidade para acompanhar cada etapa do funil."
        action={<button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}><Plus size={16} /> Novo lead</button>}
      /> :
      <DndContext sensors={[pointerSensor]} onDragEnd={dragEnd}>
        <div className="kanban">
          {stages.map((stage, i) => {
            const leads = itemByStage(stage)
            return (
              <div className="kanban-col" key={stage}>
                <div className="kanban-head"><span><i className={`stage-dot s${i}`} />{stage}</span><b>{leads.length}</b></div>
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  {leads.map(l => {
                    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: l.id })
                    return (
                      <article
                        ref={setNodeRef}
                        style={{ transform: transform == null ? undefined : CSS.Transform.toString(transform), transition }}
                        {...attributes}
                        {...listeners}
                        className="lead-card"
                        key={l.id}
                      >
                        <div className="lead-card-top"><b>{l.name}</b><span>{l.source}</span></div>
                        <p>{l.property || 'Interesse não informado'}</p>
                        <div className="lead-card-footer">
                          <a href={`https://wa.me/55${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp com ${l.name}`} title="WhatsApp"><MessageCircle size={15} /></a>
                          <a href={`tel:${l.phone}`} aria-label={`Ligar para ${l.name}`} title="Ligar"><Phone size={15} /></a>
                          <select aria-label={`Mover ${l.name} de etapa`} value={l.stage} onChange={e => move(l.id, e.target.value)}>
                            {stages.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className="action-link" title="Resumo com IA" aria-label={`Gerar resumo com IA para ${l.name}`} disabled={gerandoResumo === l.id} onClick={() => gerarResumo(l)}><Sparkles size={15} /></button>
                          <button className="action-link" title="Editar lead" aria-label={`Editar ${l.name}`} onClick={() => edit(l)}><Pencil size={15} /></button>
                          <button className="action-link" style={{ color: '#ef4444', marginLeft: '8px' }} onClick={() => setConfirmId(l.id)}>Excluir</button>
                        </div>
                      </article>
                    )
                  })}
                </SortableContext>
                <button className="add-lead" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}><Plus size={14} /> Adicionar lead</button>
              </div>
            )
          })}
        </div>
      </DndContext>}
      {modal && (
        <Modal title={editing ? 'Editar lead' : 'Cadastrar lead'} onClose={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>
          <div className="form-grid">
            <label className="span-2">Nome
              <input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </label>
            <label>Telefone
              <input required value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
            </label>
            <label>Origem
              <select value={f.source} onChange={e => setF({ ...f, source: e.target.value })}>
                <option>Instagram</option><option>WhatsApp</option><option>Indicação</option><option>Portal imobiliário</option>
              </select>
            </label>
            <label className="span-2">Imóvel de interesse
              <input value={f.property} onChange={e => setF({ ...f, property: e.target.value })} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar lead'}</button>
          </div>
        </Modal>
      )}
      {resumo && (
        <Modal title="Resumo do lead" onClose={() => setResumo(null)}>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '0 0 1rem' }}>{resumo.summary}</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setResumo(null)}>Fechar</button>
            <button className="btn primary" onClick={copiarResumo}><Copy size={15} /> Copiar texto</button>
          </div>
        </Modal>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Excluir lead"
          message={`Tem certeza que deseja excluir “${itemsRef.find(l => l.id === confirmId)?.name || 'este lead'}”? Esta ação não pode ser desfeita.`}
          busy={busy}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
