import Modal from './Modal'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button className="btn secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn danger" onClick={onConfirm} disabled={busy}>{busy ? 'Excluindo...' : confirmLabel}</button>
      </div>
    </Modal>
  )
}
