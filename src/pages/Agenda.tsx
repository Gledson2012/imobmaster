import { useMemo, useState } from 'react'
import { CalendarDays, Clock, Plus, Download, Bell } from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { EmptyState, LoadingState } from '../components/States'
import { useToast } from '../components/Toast'
import { dbAppointmentToApp, appAppointmentToDb, fetchAppointments, createAppointment, updateAppointment, deleteAppointment, isSupabaseConfigured } from '../lib/supabase'
import { localDateInput } from '../lib/dates'
import type { Appointment } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type AppointmentForm = {
  title: string
  client: string
  date: string
  time: string
  kind: string
}

function emptyForm(): AppointmentForm {
  return { title: '', client: '', date: localDateInput(), time: '10:00', kind: 'Visita' }
}

async function fetchAppointmentsList(): Promise<Appointment[]> {
  if (isSupabaseConfigured) {
    const db = await fetchAppointments()
    return db.map(dbAppointmentToApp)
  }
  const { demoAppointments } = await import('../data/demo')
  return demoAppointments
}

export default function Agenda() {
  const [items, setItems] = useState<Appointment[]>([])
  const [modal, setModal] = useState(false)
  const [f, setF] = useState<AppointmentForm>(emptyForm())
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { show } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: fetchAppointmentsList,
    initialData: [] as Appointment[],
  })

  const itemsRef = data ?? []

  const exportIcs = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ImobMaster//Agenda//PT']
    itemsRef.forEach(a => {
      const dt = new Date(`${a.date}T${a.time}:00`)
      const stamp = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const end = new Date(dt.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${a.id}@imobmaster`)
      lines.push(`DTSTAMP:${stamp}`)
      lines.push(`DTSTART:${stamp}`)
      lines.push(`DTEND:${end}`)
      lines.push(`SUMMARY:${a.title}`)
      if (a.client) lines.push(`DESCRIPTION:Cliente: ${a.client} (${a.kind})`)
      lines.push('END:VEVENT')
    })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\\r\\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `agenda-imobmaster.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  const enableNotifications = async () => {
    if (!('Notification' in window)) { show('Notificações não suportadas neste navegador.', 'error'); return }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { show('Permissão de notificação negada.', 'error'); return }
    const now = Date.now()
    let scheduled = 0
    itemsRef.forEach(a => {
      const when = new Date(`${a.date}T${a.time}:00`).getTime()
      const delay = when - now
      if (delay > 0 && delay < 1000 * 60 * 60 * 24) {
        setTimeout(() => {
          new Notification(a.title, { body: `${a.client} · ${a.time} (${a.kind})` })
        }, delay)
        scheduled++
      }
    })
    show(`${scheduled} lembrete(s) agendado(s).`, 'success')
  }

  const setAppointments = (updater: (old: Appointment[] | undefined) => Appointment[]) => {
    queryClient.setQueryData(['appointments'] as const, updater)
  }

  const save = async () => {
    if (!f.title.trim()) { show('Informe o título do compromisso.', 'error'); return }
    if (!f.date) { show('Informe a data do compromisso.', 'error'); return }
    if (!f.time) { show('Informe o horário do compromisso.', 'error'); return }
    setBusy(true)
    try {
      const fields = { title: f.title, client: f.client, date: f.date, time: f.time, kind: f.kind }
      const sortFn = (a: Appointment, b: Appointment) => (a.date + a.time).localeCompare(b.date + b.time)
      if (editing) {
        const original = itemsRef.find(a => a.id === editing)
        const merged: Appointment = { ...(original as Appointment), ...fields, id: editing }
        if (isSupabaseConfigured) {
          await updateAppointment(editing, appAppointmentToDb(merged))
        }
        setItems(old => old.map(a => a.id === editing ? merged : a).sort(sortFn))
        setAppointments(old => old?.map(a => a.id === editing ? merged : a) ?? [])
        setEditing(null)
      } else {
        const payload: Omit<Appointment, 'id' | 'created_at' | 'user_id'> = { ...fields }
        if (isSupabaseConfigured) {
          const created = await createAppointment(appAppointmentToDb(payload as Appointment))
          setItems(old => [dbAppointmentToApp(created), ...old].sort(sortFn))
          setAppointments(old => [dbAppointmentToApp(created), ...(old ?? [])].sort(sortFn))
        } else {
          setItems(old => [...old, { id: crypto.randomUUID(), ...payload }].sort(sortFn))
          setAppointments(old => [...old ?? [], { id: crypto.randomUUID(), ...payload }].sort(sortFn))
        }
      }
      setF(emptyForm())
      setModal(false)
      show(editing ? 'Compromisso atualizado com sucesso.' : 'Compromisso agendado com sucesso.', 'success')
    } catch (e: any) {
      show(e.message || 'Erro ao salvar compromisso', 'error')
    } finally {
      setBusy(false)
    }
  }

    const remove = async (id: string) => {
    const item = itemsRef.find(a => a.id === id)
    setBusy(true)
    try {
      if (isSupabaseConfigured) {
        await deleteAppointment(id)
        setAppointments(old => old?.filter(a => a.id !== id) ?? [])
      } else {
        setAppointments(old => old?.filter(a => a.id !== id) ?? [])
      }
      setConfirmId(null)
      if (item) {
        show(`“${item.title}” excluído.`, 'info', { label: 'Desfazer', onClick: () => undoDelete(item) })
      } else {
        show('Nada para desfazer.', 'info')
      }
    } catch (e: any) {
      show(e.message || 'Erro ao excluir compromisso', 'error')
    } finally {
      setBusy(false)
    }
  }

  const undoDelete = (item: Appointment) => {
    const dbPayload = appAppointmentToDb(item)
    setAppointments(old => [item, ...(old ?? [])])
    setItems(old => [item, ...old])
    createAppointment(dbPayload).catch(() => {})
    setConfirmId(null)
    show('Restaurado com sucesso.', 'success')
  }

const edit = (a: Appointment) => {
    setF({ title: a.title, client: a.client, date: a.date, time: a.time, kind: a.kind })
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
        <button className="btn secondary" onClick={exportIcs} disabled={itemsRef.length === 0}><Download size={16} /> Exportar ICS</button>
        <button className="btn secondary" onClick={enableNotifications}><Bell size={16} /> Lembretes</button>
        <button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}>
          <Plus size={17} /> Novo compromisso
        </button>
      </div>
      <div className="panel calendar-panel">
        <div className="panel-heading"><div><h2>Próximos compromissos</h2><p>Organize sua rotina de atendimento</p></div><CalendarDays color="#65d6ad" /></div>
        {isLoading ? <LoadingState /> :
        itemsRef.length === 0 ? <EmptyState
          icon={CalendarDays}
          title="Nenhum compromisso agendado"
          description="Registre visitas, reuniões e retornos para não perder nenhum atendimento."
          action={<button className="btn primary" onClick={() => { setF(emptyForm()); setEditing(null); setModal(true) }}><Plus size={16} /> Novo compromisso</button>}
        /> :
        itemsRef.map(a => (
          <div className="appointment-row" key={a.id}>
            <div className="appointment-date"><b>{new Date(a.date + 'T12:00:00').getDate()}</b><small>{new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</small></div>
            <div className="appointment-info"><b>{a.title}</b><span>{a.client}</span><small><Clock size={13} />{a.time} · {a.kind}</small></div>
            <div className="appointment-actions" style={{ display: 'flex', gap: '6px' }}>
              <button className="btn secondary small" onClick={() => edit(a)}>Editar</button>
              <button className="btn secondary small" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setConfirmId(a.id)}>Excluir</button>
            </div>
            <span className="tag">{a.kind}</span>
          </div>
        ))}
        {!isSupabaseConfigured && <div style={{ padding: '8px', color: '#77839a', fontSize: '13px' }}>Modo demonstração (local)</div>}
      </div>
      {modal && (
        <Modal title={editing ? 'Editar compromisso' : 'Novo compromisso'} onClose={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>
          <div className="form-grid">
            <label className="span-2">Título
              <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Ex.: Visita ao apartamento" />
            </label>
            <label className="span-2">Cliente / contato
              <input value={f.client} onChange={e => setF({ ...f, client: e.target.value })} />
            </label>
            <label>Data
              <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            </label>
            <label>Horário
              <input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
            </label>
            <label className="span-2">Tipo
              <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>
                <option>Visita</option><option>Follow-up</option><option>Captação</option><option>Reunião</option>
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => { setModal(false); setF(emptyForm()); setEditing(null) }}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar compromisso'}</button>
          </div>
        </Modal>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Excluir compromisso"
          message={`Tem certeza que deseja excluir “${itemsRef.find(a => a.id === confirmId)?.title || 'este compromisso'}”? Esta ação não pode ser desfeita.`}
          busy={busy}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
