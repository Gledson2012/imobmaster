import { createClient as supabaseCreateClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? supabaseCreateClient(url!, key!)
  : null

/* ------------------------------------------------------------------ */
/* Tipos espelhando o schema do Supabase                              */
/* ------------------------------------------------------------------ */

export type DbProperty = {
  id: string
  user_id: string
  code: string
  title: string
  property_type: string
  purpose: 'Venda' | 'Aluguel'
  price: number
  city: string
  neighborhood: string | null
  address: string | null
  bedrooms: number
  bathrooms: number
  area: number
  status: string
  description: string | null
  image_url: string | null
  created_at: string
}

export type DbClient = {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string
  interest: string
  budget: number
  notes: string | null
  created_at: string
}

export type DbLead = {
  id: string
  user_id: string
  name: string
  phone: string
  email: string | null
  source: string | null
  stage: string
  property_id: string | null
  property_label: string | null
  notes: string | null
  created_at: string
}

export type DbAppointment = {
  id: string
  user_id: string
  title: string
  client_id: string | null
  client_name: string | null
  lead_id: string | null
  property_id: string | null
  starts_at: string
  kind: string
  notes: string | null
  created_at: string
}

export type DbDeal = {
  id: string
  user_id: string
  property_id: string | null
  client_id: string | null
  property_label: string | null
  client_name: string | null
  deal_date: string | null
  value: number
  commission_rate: number
  status: string
  expected_at: string | null
  received_at: string | null
  notes: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/* Helpers genéricos                                                  */
/* ------------------------------------------------------------------ */

async function requireClient(): Promise<SupabaseClient> {
  if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  return supabase
}

function handleError(error: unknown, action: string): never {
  const message = error instanceof Error ? error.message : String(error)
  throw new Error(`Falha ao ${action}: ${message}`)
}

/* ------------------------------------------------------------------ */
/* Properties                                                         */
/* ------------------------------------------------------------------ */

export async function fetchProperties(): Promise<DbProperty[]> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) handleError(error, 'buscar imóveis')
  return data ?? []
}

export async function createProperty(input: Omit<DbProperty, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbProperty> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('properties')
    .insert(input)
    .select()
    .single()
  if (error) handleError(error, 'criar imóvel')
  return data
}

export async function updateProperty(id: string, input: Partial<DbProperty>): Promise<DbProperty> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('properties')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error, 'atualizar imóvel')
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  const sb = await requireClient()
  const { error } = await sb.from('properties').delete().eq('id', id)
  if (error) handleError(error, 'excluir imóvel')
}

/* ------------------------------------------------------------------ */
/* Clients                                                            */
/* ------------------------------------------------------------------ */

export async function fetchClients(): Promise<DbClient[]> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) handleError(error, 'buscar clientes')
  return data ?? []
}

export async function createClient(input: Omit<DbClient, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbClient> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('clients')
    .insert(input)
    .select()
    .single()
  if (error) handleError(error, 'criar cliente')
  return data
}

export async function updateClient(id: string, input: Partial<DbClient>): Promise<DbClient> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error, 'atualizar cliente')
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const sb = await requireClient()
  const { error } = await sb.from('clients').delete().eq('id', id)
  if (error) handleError(error, 'excluir cliente')
}

/* ------------------------------------------------------------------ */
/* Leads                                                              */
/* ------------------------------------------------------------------ */

export async function fetchLeads(): Promise<DbLead[]> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) handleError(error, 'buscar leads')
  return data ?? []
}

export async function createLead(input: Omit<DbLead, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbLead> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('leads')
    .insert(input)
    .select()
    .single()
  if (error) handleError(error, 'criar lead')
  return data
}

export async function updateLead(id: string, input: Partial<DbLead>): Promise<DbLead> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('leads')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error, 'atualizar lead')
  return data
}

export async function deleteLead(id: string): Promise<void> {
  const sb = await requireClient()
  const { error } = await sb.from('leads').delete().eq('id', id)
  if (error) handleError(error, 'excluir lead')
}

/* ------------------------------------------------------------------ */
/* Appointments                                                       */
/* ------------------------------------------------------------------ */

export async function fetchAppointments(): Promise<DbAppointment[]> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('appointments')
    .select('*')
    .order('starts_at', { ascending: true })
  if (error) handleError(error, 'buscar compromissos')
  return data ?? []
}

export async function createAppointment(input: Omit<DbAppointment, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbAppointment> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('appointments')
    .insert(input)
    .select()
    .single()
  if (error) handleError(error, 'criar compromisso')
  return data
}

export async function updateAppointment(id: string, input: Partial<DbAppointment>): Promise<DbAppointment> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('appointments')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error, 'atualizar compromisso')
  return data
}

export async function deleteAppointment(id: string): Promise<void> {
  const sb = await requireClient()
  const { error } = await sb.from('appointments').delete().eq('id', id)
  if (error) handleError(error, 'excluir compromisso')
}

/* ------------------------------------------------------------------ */
/* Deals                                                              */
/* ------------------------------------------------------------------ */

export async function fetchDeals(): Promise<DbDeal[]> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) handleError(error, 'buscar negócios')
  return data ?? []
}

export async function createDeal(input: Omit<DbDeal, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbDeal> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('deals')
    .insert(input)
    .select()
    .single()
  if (error) handleError(error, 'criar negócio')
  return data
}

export async function updateDeal(id: string, input: Partial<DbDeal>): Promise<DbDeal> {
  const sb = await requireClient()
  const { data, error } = await sb
    .from('deals')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error, 'atualizar negócio')
  return data
}

export async function deleteDeal(id: string): Promise<void> {
  const sb = await requireClient()
  const { error } = await sb.from('deals').delete().eq('id', id)
  if (error) handleError(error, 'excluir negócio')
}

/* ------------------------------------------------------------------ */
/* Storage (fotos de imóveis)                                         */
/* ------------------------------------------------------------------ */

const BUCKET = 'property-photos'

export async function uploadPropertyPhoto(propertyId: string, file: File): Promise<string> {
  const sb = await requireClient()
  const fileName = `${propertyId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
  const { error: upError } = await sb.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (upError) handleError(upError, 'enviar foto')
  const { data } = sb.storage.from(BUCKET).getPublicUrl(fileName)
  return data.publicUrl
}

export async function deletePropertyPhoto(fileName: string): Promise<void> {
  const sb = await requireClient()
  const { error } = await sb.storage.from(BUCKET).remove([fileName])
  if (error) handleError(error, 'remover foto')
}

/* ------------------------------------------------------------------ */
/* Mapeadores banco <-> app                                           */
/* ------------------------------------------------------------------ */

import type { Property, Client, Lead, Appointment, Deal } from '../types'
import { localDateInput, localTimeInput } from './dates'

export function dbPropertyToApp(p: DbProperty): Property {
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    type: p.property_type,
    purpose: p.purpose,
    price: Number(p.price),
    city: p.city,
    neighborhood: p.neighborhood ?? '',
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: Number(p.area),
    status: (p.status as Property['status']) ?? 'Disponível',
    image_url: p.image_url ?? undefined,
    description: p.description ?? undefined,
    address: p.address ?? undefined,
    user_id: p.user_id,
    created_at: p.created_at,
  }
}

export function appPropertyToDb(p: Property, userId?: string): Omit<DbProperty, 'id' | 'created_at' | 'user_id'> & { user_id?: string } {
  return {
    ...(userId ? { user_id: userId } : {}),
    code: p.code,
    title: p.title,
    property_type: p.type,
    purpose: p.purpose,
    price: p.price,
    city: p.city,
    neighborhood: p.neighborhood || null,
    address: p.address ?? null,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.area,
    status: p.status,
    description: p.description ?? null,
    image_url: p.image_url ?? null,
  }
}

export function dbClientToApp(c: DbClient): Client {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? '',
    phone: c.phone,
    interest: c.interest,
    budget: Number(c.budget),
    notes: c.notes ?? undefined,
    user_id: c.user_id,
    created_at: c.created_at,
  }
}

export function appClientToDb(c: Client, userId?: string): Omit<DbClient, 'id' | 'created_at' | 'user_id'> & { user_id?: string } {
  return {
    ...(userId ? { user_id: userId } : {}),
    name: c.name,
    email: c.email || null,
    phone: c.phone,
    interest: c.interest,
    budget: c.budget,
    notes: c.notes ?? null,
  }
}

export function dbLeadToApp(l: DbLead): Lead {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email ?? undefined,
    source: l.source ?? '',
    stage: l.stage,
    property: l.property_label ?? undefined,
    property_id: l.property_id ?? undefined,
    notes: l.notes ?? undefined,
    user_id: l.user_id,
    created_at: l.created_at,
  }
}

export function appLeadToDb(l: Lead, userId?: string): Omit<DbLead, 'id' | 'created_at' | 'user_id'> & { user_id?: string } {
  return {
    ...(userId ? { user_id: userId } : {}),
    name: l.name,
    phone: l.phone,
    email: l.email ?? null,
    source: l.source || null,
    stage: l.stage,
    property_id: l.property_id ?? null,
    property_label: l.property ?? null,
    notes: l.notes ?? null,
  }
}

export function dbAppointmentToApp(a: DbAppointment): Appointment {
  const d = new Date(a.starts_at)
  return {
    id: a.id,
    title: a.title,
    client: a.client_name ?? '',
    client_id: a.client_id ?? undefined,
    lead_id: a.lead_id ?? undefined,
    property_id: a.property_id ?? undefined,
    date: localDateInput(d),
    time: localTimeInput(d),
    kind: a.kind,
    notes: a.notes ?? undefined,
    user_id: a.user_id,
    created_at: a.created_at,
  }
}

export function appAppointmentToDb(a: Appointment, userId?: string): Omit<DbAppointment, 'id' | 'created_at' | 'user_id'> & { user_id?: string } {
  return {
    ...(userId ? { user_id: userId } : {}),
    title: a.title,
    client_id: a.client_id ?? null,
    client_name: a.client || null,
    lead_id: a.lead_id ?? null,
    property_id: a.property_id ?? null,
    starts_at: new Date(`${a.date}T${a.time}:00`).toISOString(),
    kind: a.kind,
    notes: a.notes ?? null,
  }
}

export function dbDealToApp(d: DbDeal): Deal {
  return {
    id: d.id,
    property: d.property_label ?? '',
    property_id: d.property_id ?? undefined,
    client: d.client_name ?? '',
    client_id: d.client_id ?? undefined,
    value: Number(d.value),
    commission_rate: Number(d.commission_rate),
    status: d.status,
    date: d.deal_date ?? d.created_at.slice(0, 10),
    expected_at: d.expected_at ?? undefined,
    received_at: d.received_at ?? undefined,
    notes: d.notes ?? undefined,
    user_id: d.user_id,
    created_at: d.created_at,
  }
}

export function appDealToDb(d: Deal, userId?: string): Omit<DbDeal, 'id' | 'created_at' | 'user_id'> & { user_id?: string } {
  return {
    ...(userId ? { user_id: userId } : {}),
    property_id: d.property_id ?? null,
    client_id: d.client_id ?? null,
    property_label: d.property || null,
    client_name: d.client || null,
    deal_date: d.date || null,
    value: d.value,
    commission_rate: d.commission_rate,
    status: d.status,
    expected_at: d.expected_at ?? null,
    received_at: d.received_at ?? null,
    notes: d.notes ?? null,
  }
}

export async function fetchProfile(userId: string): Promise<{ id: string; full_name: string; phone?: string | null; created_at?: string } | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) return null
  return data as { id: string; full_name: string; phone?: string | null; created_at?: string }
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string }): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase não configurado' }
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) return { error: error.message }
  return { error: null }
}
