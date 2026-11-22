import { useMemo, useState } from 'react'
import { CircleDollarSign, Download, Plus } from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { EmptyState, LoadingState } from '../components/States'
import { useToast } from '../components/Toast'
import { dbDealToApp, appDealToDb, fetchDeals, createDeal, updateDeal, deleteDeal, isSupabaseConfigured } from '../lib/supabase'
import { localDateInput } from '../lib/dates'
import type { Deal } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type DealForm = {
  property: string
  client: string
  value: string
  commission_rate: string
  status: string
  date: string
}

function emptyForm(): DealForm {
  return { property: '', client: '', value: '', commission_rate: '5', status: 'Em andamento', date: localDateInput() }
}

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

async function fetchDealsList(): Promise<Deal[]> {
  if (isSupabaseConfigured) {
    const db = await fetchDeals()
    return db.map(dbDealToApp)
  }
  const { demoDeals } = await import('../data/demo')
  return demoDeals
}

export default function Finance() {
  const [items, setItems] = useState<Deal[]>([])
  const [modal, setModal] = useState(false)
  const [f, setF] = useState<DealForm>(emptyForm())
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { show } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: fetchDealsList,
    initialData: [] as Deal[],
  })

  const itemsRef = data ?? []
  const setDeals = (updater: (old: Deal[] | undefined) => Deal[]) => {
    queryClient.setQueryData(['deals'] as const, updater)
  }

  const commission = (d: Deal) => d.value * d.commission_rate / 100
  const activeDeals = itemsRef.filter(d => d.status === 'Em andamento' || d.status === 'Proposta enviada')
  const expected = activeDeals.reduce((s, d) => s + commission(d), 0)
  const closedDeals = itemsRef.filter(d => d.status === 'Fechado')
  const monthNow = localDateInput().slice(0, 7)
  const closedThisMonth = closedDeals.filter(d => (d.received_at ?? d.date).slice(0, 7) === monthNow)
  const receivedMonth = closedThisMonth.reduce((s, d) => s + commission(d), 0)
  const receivedTotal = closedDeals.reduce((s, d) => s + commission(d), 0)

  const exportCsv = () => {
    const header = 'Imóvel/Negócio;Cliente;Valor (R$);Taxa (%);Comissão (R$);Status;Data'
    const rows = itemsRef.map(d => [d.property, d.client, d.value.toFixed(2).replace('.', ','), String(d.commission_rate).replace('.', ','), commission(d).toFixed(2).replace('.', ','), d.status, d.date].join(';'))
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `negocios-imobmaster-${localDateInput()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    show('Arquivo CSV exportado.', 'success')
  }

  const save = async () => {
    if (!f.property.trim() || !f.client.trim() || !f.value) { show('Informe o negócio, o cliente e o valor.', 'error'); return }
    setBusy(true)
    try {
      const fields = {
        property: f.property,
        client: f.client,
        value: Number(f.value),
        commission_rate: Number(f.commission_rate) || 5,
        status: f.status,
        date: f.date,
      }
      if (editing) {
        const original = itemsRef.find(d => d.id === editing)
        const merged: Deal = { ...(original as Deal), ...fields, id: editing }
        if (isSupabaseConfigured) {
          await updateDeal(editing, appDealToDb(merged))
        }
        setItems(old => old.map(d => d.id === editing ? merged : d))
        setDeals(old => old?.map(d => d.id === editing ? merged : d) ?? [])
        setEditing(null)
      } else {
        const payload: Omit<Deal, 'id' | 'created_at' | 'user_id'> = { ...fields }
        if (isSupabaseConfigured) {
          const created = await createDeal(appDealToDb(payload as Deal))
          setItems(old => [dbDealToApp(created), ...old])
          setDeals(old => [dbDealToApp(created), ...(old ?? [])])
        } else {
          setItems(old => [{ id: crypto.randomUUID(), ...payload }, ...old])
          setDeals(old => [{ id: crypto.randomUUID(), ...payload }, ...(old ?? [])])
        }
      }
      setF(emptyForm())
      setModal(false)
      show(editing ? 'Negócio atualizado com sucesso.' : 'Negócio cadastrado com sucesso.', 'success')
    } catch (e: any) {
      show(e.message || 'Erro ao salvar negócio', 'error')
    } finally {
      setBusy(false)
    }
  }

    const remove = async (id: string) => {
    const item = itemsRef.find(d => d.id === id)
    setBusy(true)
    try {
      if (isSupabaseConfigured) {
        await deleteDeal(id)
        setDeals(old => old?.filter(d => d.id !== id) ?? [])
      } else {
        setDeals(old => old?.filter(d => d.id !== id) ?? [])
      }
      setConfirmId(null)
      if (item) {
        show(`“${item.property}” — ${item.client}`, 'info', { label: 'Desfazer', onClick: () => undoDelete(item) })
      } else {
        show('Nada para desfazer.', 'info')
      }
    } catch (e: any) {
      show(e.message || 'Erro ao excluir negócio', 'error')
    } finally {
      setBusy(false)
    }
  }

  const undoDelete = (item: Deal) => {
    const dbPayload = appDealToDb(item)
    setDeals(old => [item, ...(old ?? [])])
    setItems(old => [item, ...old])
    createDeal(dbPayload).catch(() => {})
    setConfirmId(null)
    show('Restaurado com sucesso.', 'success')
  }

const edit = (d: Deal) => {
    setF({ property: d.property, client: d.client, value: String(d.value), commission_rate: String(d.commission_rate), status: d.status, date: d.date })
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
        <button className="btn secondary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}><Plus size={16} /> Nova negociação</button>
        <button className="btn secondary" onClick={exportCsv} disabled={itemsRef.length === 0}><Download size={16} /> Exportar CSV</button>
      </div>
      <div className="stats-grid three">
        <div className="stat-card"><div className="stat-top"><span>Comissões previstas</span><CircleDollarSign className="mint-text" /></div><strong>{money(expected)}</strong><div className="stat-foot">{activeDeals.length} negociações ativas</div></div>
        <div className="stat-card"><div className="stat-top"><span>Recebido no mês</span><CircleDollarSign className="blue-text" /></div><strong>{money(receivedMonth)}</strong><div className="stat-foot">{closedThisMonth.length} negócios fechados neste mês</div></div>
        <div className="stat-card"><div className="stat-top"><span>Comissões recebidas</span><CircleDollarSign className="purple-text" /></div><strong>{money(receivedTotal)}</strong><div className="stat-foot">{closedDeals.length} negócios fechados no total</div></div>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>Negociações e comissões</h2><p>Estimativa calculada com a taxa cadastrada em cada negócio</p></div></div>
        <table>
          <thead>
            <tr>
              <th>IMÓVEL / NEGÓCIO</th><th>CLIENTE</th><th>VALOR</th><th>TAXA</th><th>COMISSÃO ESTIMADA</th><th>STATUS</th><th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7}><LoadingState /></td></tr> :
            itemsRef.length === 0 ? <tr><td colSpan={7}><EmptyState
              icon={CircleDollarSign}
              title="Nenhum negócio cadastrado"
              description="Registre suas negociações para acompanhar comissões previstas e recebidas."
              action={<button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}><Plus size={16} /> Nova negociação</button>}
            /></td></tr> :
            itemsRef.map(d => (
              <tr key={d.id}>
                <td><b>{d.property}</b></td>
                <td>{d.client}</td>
                <td>{money(d.value)}</td>
                <td>{d.commission_rate}%</td>
                <td><b className="mint-text">{money(d.value * d.commission_rate / 100)}</b></td>
                <td><span className={`status ${d.status === 'Fechado' ? 'available' : 'pending'}`}>{d.status}</span></td>
                <td>
                  <button className="action-link" onClick={() => edit(d)}>Editar</button>
                  <button className="action-link" style={{ color: '#ef4444' }} onClick={() => setConfirmId(d.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isSupabaseConfigured && <div style={{ padding: '8px', color: '#77839a', fontSize: '13px' }}>Modo demonstração (local)</div>}
      </section>
      {modal && (
        <Modal title={editing ? 'Editar negociação' : 'Nova negociação'} onClose={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>
          <div className="form-grid">
            <label className="span-2">Imóvel / negócio
              <input required value={f.property} onChange={e => setF({ ...f, property: e.target.value })} placeholder="Ex.: Apartamento Astúrias" />
            </label>
            <label className="span-2">Cliente
              <input required value={f.client} onChange={e => setF({ ...f, client: e.target.value })} placeholder="Ex.: Mariana Oliveira" />
            </label>
            <label>Valor (R$)
              <input required type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} />
            </label>
            <label>Taxa de comissão (%)
              <input type="number" value={f.commission_rate} onChange={e => setF({ ...f, commission_rate: e.target.value })} />
            </label>
            <label className="span-2">Status
              <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
                <option>Em andamento</option><option>Proposta enviada</option><option>Fechado</option><option>Perdido</option>
              </select>
            </label>
            <label>Data
              <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar negócio'}</button>
          </div>
        </Modal>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Tem certeza que deseja excluir “${itemsRef.find(d => d.id === confirmId)?.property || 'este negócio'}”? Esta ação não pode ser desfeita.`}
          busy={busy}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <p className="notice">Os valores são estimativas de controle. Confirme taxas, contratos e datas de recebimento antes de considerar uma comissão como realizada.</p>
      {!isSupabaseConfigured && <p className="notice" style={{ color: '#ef4444' }}>Configure o Supabase para persistir seus dados.</p>}
    </div>
  )
}
