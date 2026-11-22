import type { Appointment, Client, Deal, Lead, Property } from '../types'
import { localDateInput } from '../lib/dates'

export const demoProperties: Property[] = [
  { id:'p1', code:'IM-001', title:'Apartamento com varanda gourmet', type:'Apartamento', purpose:'Venda', price:685000, city:'Guarujá', neighborhood:'Astúrias', bedrooms:3, bathrooms:2, area:112, status:'Disponível', image_url:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900', created_at:new Date().toISOString() },
  { id:'p2', code:'IM-002', title:'Casa moderna com piscina', type:'Casa', purpose:'Venda', price:1250000, city:'Santos', neighborhood:'Embaré', bedrooms:4, bathrooms:3, area:240, status:'Em negociação', image_url:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900', created_at:new Date(Date.now()-35*24*60*60*1000).toISOString() },
  { id:'p3', code:'IM-003', title:'Studio próximo à praia', type:'Studio', purpose:'Aluguel', price:2800, city:'Guarujá', neighborhood:'Pitangueiras', bedrooms:1, bathrooms:1, area:42, status:'Disponível', image_url:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900', created_at:new Date(Date.now()-70*24*60*60*1000).toISOString() }
]
export const demoClients: Client[] = [
  { id:'c1', name:'Mariana Oliveira', email:'mariana@email.com', phone:'(13) 99999-1010', interest:'Apartamento 3 quartos', budget:750000 },
  { id:'c2', name:'Roberto Santos', email:'roberto@email.com', phone:'(13) 98888-2020', interest:'Casa com piscina', budget:1400000 },
  { id:'c3', name:'Ana Paula Lima', email:'ana@email.com', phone:'(13) 97777-3030', interest:'Imóvel para aluguel', budget:3500 }
]
export const demoLeads: Lead[] = [
  { id:'l1', name:'Carlos Mendes', phone:'(13) 99666-1111', source:'Instagram', stage:'Novo', property:'Apartamento Astúrias' },
  { id:'l2', name:'Fernanda Costa', phone:'(13) 99555-2222', source:'Portal imobiliário', stage:'Em contato', property:'Casa com piscina' },
  { id:'l3', name:'Paulo Henrique', phone:'(13) 99444-3333', source:'WhatsApp', stage:'Visita agendada', property:'Studio Pitangueiras' }
]
export const demoAppointments: Appointment[] = [
  { id:'a1', title:'Visita - Apartamento Astúrias', client:'Mariana Oliveira', date:localDateInput(), time:'10:00', kind:'Visita' },
  { id:'a2', title:'Retorno de proposta', client:'Roberto Santos', date:localDateInput(), time:'14:30', kind:'Follow-up' },
  { id:'a3', title:'Captação de imóvel', client:'Proprietário novo', date:localDateInput(new Date(Date.now()+24*60*60*1000)), time:'09:00', kind:'Captação' }
]
export const demoDeals: Deal[] = [
  { id:'d1', property:'Apartamento - Astúrias', client:'Mariana Oliveira', value:685000, commission_rate:5, status:'Em andamento', date:localDateInput() },
  { id:'d2', property:'Casa - Embaré', client:'Roberto Santos', value:1250000, commission_rate:5, status:'Proposta enviada', date:localDateInput() }
]
