import { X } from 'lucide-react'
import type { ReactNode } from 'react'
export default function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget) onClose()}}><section className="modal"><header><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></header>{children}</section></div>
}