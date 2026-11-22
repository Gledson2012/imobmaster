import { useMemo, useState } from 'react'
import { Plus, Search, Phone, Mail, MessageCircle, ContactRound } from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { EmptyState, LoadingState } from '../components/States'
import { useToast } from '../components/Toast'
import { dbClientToApp, appClientToDb, fetchClients, createClient, updateClient, deleteClient, isSupabaseConfigured } from '../lib/supabase'
import type { Client } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type ClientForm = {
  name: string
  email: string
  phone: string
  interest: string
  budget: string
}

function emptyForm(): ClientForm {
  return { name: '', email: '', phone: '', interest: '', budget: '' }
}

async function fetchClientsList(): Promise<Client[]> {
  if (isSupabaseConfigured) {
    const db = await fetchClients()
    return db.map(dbClientToApp)
  }
  const { demoClients } = await import('../data/demo')
  return demoClients
}

function money(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default function Clients() {
  const [items, setItems] = useState<Client[]>([])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [f, setF] = useState<ClientForm>(emptyForm())
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { show } = useToast()
  const queryClient = useQueryClient()

  const setClients = (updater: (old: Client[] | undefined) => Client[]) => {
    queryClient.setQueryData(['clients'] as const, updater)
  }


  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClientsList,
    initialData: [] as Client[],
  })

  const itemsRef = data ?? []
  const filtered = useMemo(() => itemsRef.filter(c => c.name.toLowerCase().includes(q.toLowerCase())), [itemsRef, q])

  const save = async () => {
    if (!f.name.trim()) { show('Informe o nome do cliente.', 'error'); return }
    setBusy(true)
    try {
      const payload: Omit<Client, 'id' | 'created_at' | 'user_id'> = { name: f.name, email: f.email, phone: f.phone, interest: f.interest, budget: Number(f.budget) || 0 }
      if (editing) {
        const original = itemsRef.find(c => c.id === editing)
        const merged: Client = { ...(original as Client), ...payload, id: editing }
        if (isSupabaseConfigured) {
          await updateClient(editing, appClientToDb(merged))
        }
        setClients(old => old?.map(c => c.id === editing ? merged : c) ?? [])
        setEditing(null)
      } else {
        if (isSupabaseConfigured) {
          const created = await createClient(appClientToDb(payload as Client))
          setItems(old => [dbClientToApp(created), ...old])
          setClients(old => [dbClientToApp(created), ...(old ?? [])])
        } else {
          setItems(old => [{ id: crypto.randomUUID(), ...payload }, ...old])
          setClients(old => [{ id: crypto.randomUUID(), ...payload }, ...(old ?? [])])
        }
      }
      setF(emptyForm())
      setModal(false)
      show(editing ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.', 'success')
    } catch (e: any) {
      show(e.message || 'Erro ao salvar cliente', 'error')
    } finally {
      setBusy(false)
    }
  }

    const remove = async (id: string) => {
    const item = itemsRef.find(c => c.id === id)
    setBusy(true)
    try {
      if (isSupabaseConfigured) {
        await deleteClient(id)
        setClients(old => old?.filter(c => c.id !== id) ?? [])
      } else {
        setClients(old => old?.filter(c => c.id !== id) ?? [])
      }
      setConfirmId(null)
      if (item) {
        show(`“${item.name}” excluído.`, 'info', { label: 'Desfazer', onClick: () => undoDelete(item) })
      } else {
        show('Nada para desfazer.', 'info')
      }
    } catch (e: any) {
      show(e.message || 'Erro ao excluir cliente', 'error')
    } finally {
      setBusy(false)
    }
  }

  const undoDelete = (item: Client) => {
    const dbPayload = appClientToDb(item)
    setItems(old => [item, ...old])
    setClients(old => [item, ...(old ?? [])])
    createClient(dbPayload).catch(() => {})
    setConfirmId(null)
    show('Restaurado com sucesso.', 'success')
  }

const edit = (c: Client) => {
    setF({ name: c.name, email: c.email, phone: c.phone, interest: c.interest, budget: String(c.budget) })
    setEditing(c.id)
    setModal(true)
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">RELACIONAMENTO</div>
          <h1>Clientes</h1>
          <p>Organize seus contatos e entenda o que cada cliente procura.</p>
        </div>
        <button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}>
          <Plus size={17} /> Novo cliente
        </button>
      </div>
      <div className="toolbar">
        <div className="input-search">
          <Search size={17} />
          <input placeholder="Buscar cliente..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <span className="muted">{filtered.length} clientes</span>
        {!isSupabaseConfigured && <span className="muted" style={{ marginLeft: '12px' }}>Modo demonstração (local)</span>}
      </div>
      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>CLIENTE</th><th>CONTATO</th><th>INTERESSE</th><th>ORÇAMENTO</th><th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5}><LoadingState /></td></tr> :
            filtered.length === 0 ? <tr><td colSpan={5}><EmptyState
              icon={ContactRound}
              title={itemsRef.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
              description={itemsRef.length === 0 ? 'Cadastre seus contatos para acompanhar interesses e orçamentos.' : 'Tente outro termo de busca.'}
              action={itemsRef.length === 0 && <button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}><Plus size={16} /> Novo cliente</button>}
            /></td></tr> :
            filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="table-person">
                    <div className="lead-avatar">{c.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</div>
                    <b>{c.name}</b>
                  </div>
                </td>
                <td>
                  <span className="table-contact"><Mail size={13} />{c.email}</span>
                  <span className="table-contact"><Phone size={13} />{c.phone}</span>
                </td>
                <td>{c.interest}</td>
                <td><b>{money(c.budget)}</b></td>
                <td>
                  <button className="action-link" onClick={() => edit(c)}>Editar</button>
                  <a className="action-link" style={{ marginLeft: '12px' }} href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
                  <button className="action-link" style={{ color: '#ef4444', marginLeft: '12px' }} onClick={() => setConfirmId(c.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isSupabaseConfigured && <div style={{ padding: '8px', color: '#77839a', fontSize: '13px' }}>Modo demonstração (local)</div>}
      </div>
      {modal && (
        <Modal title={editing ? 'Editar cliente' : 'Adicionar cliente'} onClose={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>
          <div className="form-grid">
            <label className="span-2">Nome completo
              <input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </label>
            <label>E-mail
              <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
            </label>
            <label>Telefone
              <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
            </label>
            <label className="span-2">Interesse
              <input value={f.interest} onChange={e => setF({ ...f, interest: e.target.value })} />
            </label>
            <label>Orçamento (R$)
              <input type="number" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar cliente'}</button>
          </div>
        </Modal>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Tem certeza que deseja excluir “${itemsRef.find(c => c.id === confirmId)?.name || 'este cliente'}”? Esta ação não pode ser desfeita.`}
          busy={busy}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
