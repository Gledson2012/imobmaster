import type { SupabaseClient } from '@supabase/supabase-js'
import type { Property, Client, Lead, Appointment, Deal } from '../types'
import { localDateInput, localTimeInput } from './dates'

/* ------------------------------------------------------------------ */
/* Modo 100% gratuito / offline: persistência em localStorage          */
/* ------------------------------------------------------------------ */

export const isSupabaseConfigured = true
export const supabase: SupabaseClient | null = null

/* ------------------------------------------------------------------ */
/* Tipos espelhando o schema (mantidos para compatibilidade)           */
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
  images: string[] | null
  tags: string[] | null
  lat: number | null
  lng: number | null
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

const USER_ID = 'local-user'

const KEYS = {
  properties: 'imobmaster:properties',
  clients: 'imobmaster:clients',
  leads: 'imobmaster:leads',
  appointments: 'imobmaster:appointments',
  deals: 'imobmaster:deals',
  profile: 'imobmaster:profile',
}

function readArray<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    return JSON.parse(raw) as T[]
  } catch {
    return null
  }
}

function writeArray<T>(key: string, arr: T[]): void {
  localStorage.setItem(key, JSON.stringify(arr))
}

function nowIso(): string {
  return new Date().toISOString()
}

/* ------------------------------------------------------------------ */
/* Seed a partir dos dados demonstrativos                              */
/* ------------------------------------------------------------------ */

import { demoProperties, demoClients, demoLeads, demoAppointments, demoDeals } from '../data/demo'

function seedProperties(): DbProperty[] {
  return demoProperties.map((p) => ({
    id: p.id,
    user_id: USER_ID,
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
    images: p.images ?? null,
    tags: p.tags ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    created_at: p.created_at ?? nowIso(),
  }))
}

function seedClients(): DbClient[] {
  return demoClients.map((c) => ({
    id: c.id,
    user_id: USER_ID,
    name: c.name,
    email: c.email || null,
    phone: c.phone,
    interest: c.interest,
    budget: c.budget,
    notes: c.notes ?? null,
    created_at: c.created_at ?? nowIso(),
  }))
}

function seedLeads(): DbLead[] {
  return demoLeads.map((l) => ({
    id: l.id,
    user_id: USER_ID,
    name: l.name,
    phone: l.phone,
    email: l.email ?? null,
    source: l.source || null,
    stage: l.stage,
    property_id: l.property_id ?? null,
    property_label: l.property ?? null,
    notes: l.notes ?? null,
    created_at: l.created_at ?? nowIso(),
  }))
}

function seedAppointments(): DbAppointment[] {
  return demoAppointments.map((a) => ({
    id: a.id,
    user_id: USER_ID,
    title: a.title,
    client_id: a.client_id ?? null,
    client_name: a.client || null,
    lead_id: a.lead_id ?? null,
    property_id: a.property_id ?? null,
    starts_at: new Date(`${a.date}T${a.time}:00`).toISOString(),
    kind: a.kind,
    notes: a.notes ?? null,
    created_at: a.created_at ?? nowIso(),
  }))
}

function seedDeals(): DbDeal[] {
  return demoDeals.map((d) => ({
    id: d.id,
    user_id: USER_ID,
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
    created_at: d.created_at ?? nowIso(),
  }))
}

/* ------------------------------------------------------------------ */
/* Properties                                                         */
/* ------------------------------------------------------------------ */

export async function fetchProperties(): Promise<DbProperty[]> {
  let data = readArray<DbProperty>(KEYS.properties)
  if (data === null) {
    data = seedProperties()
    writeArray(KEYS.properties, data)
  }
  return data
}

export async function createProperty(input: Omit<DbProperty, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbProperty> {
  const list = await fetchProperties()
  const created: DbProperty = {
    id: crypto.randomUUID(),
    user_id: input.user_id ?? USER_ID,
    code: input.code,
    title: input.title,
    property_type: input.property_type,
    purpose: input.purpose,
    price: input.price,
    city: input.city,
    neighborhood: input.neighborhood,
    address: input.address,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    area: input.area,
    status: input.status,
    description: input.description,
    image_url: input.image_url,
    images: input.images,
    tags: input.tags,
    lat: input.lat,
    lng: input.lng,
    created_at: nowIso(),
  }
  list.unshift(created)
  writeArray(KEYS.properties, list)
  return created
}

export async function updateProperty(id: string, input: Partial<DbProperty>): Promise<DbProperty> {
  const list = await fetchProperties()
  const idx = list.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('Imóvel não encontrado')
  list[idx] = { ...list[idx], ...input }
  writeArray(KEYS.properties, list)
  return list[idx]
}

export async function deleteProperty(id: string): Promise<void> {
  const list = await fetchProperties()
  writeArray(KEYS.properties, list.filter((x) => x.id !== id))
}

/* ------------------------------------------------------------------ */
/* Clients                                                            */
/* ------------------------------------------------------------------ */

export async function fetchClients(): Promise<DbClient[]> {
  let data = readArray<DbClient>(KEYS.clients)
  if (data === null) {
    data = seedClients()
    writeArray(KEYS.clients, data)
  }
  return data
}

export async function createClient(input: Omit<DbClient, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbClient> {
  const list = await fetchClients()
  const created: DbClient = {
    id: crypto.randomUUID(),
    user_id: input.user_id ?? USER_ID,
    name: input.name,
    email: input.email,
    phone: input.phone,
    interest: input.interest,
    budget: input.budget,
    notes: input.notes,
    created_at: nowIso(),
  }
  list.unshift(created)
  writeArray(KEYS.clients, list)
  return created
}

export async function updateClient(id: string, input: Partial<DbClient>): Promise<DbClient> {
  const list = await fetchClients()
  const idx = list.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('Cliente não encontrado')
  list[idx] = { ...list[idx], ...input }
  writeArray(KEYS.clients, list)
  return list[idx]
}

export async function deleteClient(id: string): Promise<void> {
  const list = await fetchClients()
  writeArray(KEYS.clients, list.filter((x) => x.id !== id))
}

/* ------------------------------------------------------------------ */
/* Leads                                                              */
/* ------------------------------------------------------------------ */

export async function fetchLeads(): Promise<DbLead[]> {
  let data = readArray<DbLead>(KEYS.leads)
  if (data === null) {
    data = seedLeads()
    writeArray(KEYS.leads, data)
  }
  return data
}

export async function createLead(input: Omit<DbLead, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbLead> {
  const list = await fetchLeads()
  const created: DbLead = {
    id: crypto.randomUUID(),
    user_id: input.user_id ?? USER_ID,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: input.source,
    stage: input.stage,
    property_id: input.property_id,
    property_label: input.property_label,
    notes: input.notes,
    created_at: nowIso(),
  }
  list.unshift(created)
  writeArray(KEYS.leads, list)
  return created
}

export async function updateLead(id: string, input: Partial<DbLead>): Promise<DbLead> {
  const list = await fetchLeads()
  const idx = list.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('Lead não encontrado')
  list[idx] = { ...list[idx], ...input }
  writeArray(KEYS.leads, list)
  return list[idx]
}

export async function deleteLead(id: string): Promise<void> {
  const list = await fetchLeads()
  writeArray(KEYS.leads, list.filter((x) => x.id !== id))
}

/* ------------------------------------------------------------------ */
/* Appointments                                                       */
/* ------------------------------------------------------------------ */

export async function fetchAppointments(): Promise<DbAppointment[]> {
  let data = readArray<DbAppointment>(KEYS.appointments)
  if (data === null) {
    data = seedAppointments()
    writeArray(KEYS.appointments, data)
  }
  return data
}

export async function createAppointment(input: Omit<DbAppointment, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbAppointment> {
  const list = await fetchAppointments()
  const created: DbAppointment = {
    id: crypto.randomUUID(),
    user_id: input.user_id ?? USER_ID,
    title: input.title,
    client_id: input.client_id,
    client_name: input.client_name,
    lead_id: input.lead_id,
    property_id: input.property_id,
    starts_at: input.starts_at,
    kind: input.kind,
    notes: input.notes,
    created_at: nowIso(),
  }
  list.unshift(created)
  writeArray(KEYS.appointments, list)
  return created
}

export async function updateAppointment(id: string, input: Partial<DbAppointment>): Promise<DbAppointment> {
  const list = await fetchAppointments()
  const idx = list.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('Compromisso não encontrado')
  list[idx] = { ...list[idx], ...input }
  writeArray(KEYS.appointments, list)
  return list[idx]
}

export async function deleteAppointment(id: string): Promise<void> {
  const list = await fetchAppointments()
  writeArray(KEYS.appointments, list.filter((x) => x.id !== id))
}

/* ------------------------------------------------------------------ */
/* Deals                                                              */
/* ------------------------------------------------------------------ */

export async function fetchDeals(): Promise<DbDeal[]> {
  let data = readArray<DbDeal>(KEYS.deals)
  if (data === null) {
    data = seedDeals()
    writeArray(KEYS.deals, data)
  }
  return data
}

export async function createDeal(input: Omit<DbDeal, 'id' | 'created_at' | 'user_id'> & { user_id?: string }): Promise<DbDeal> {
  const list = await fetchDeals()
  const created: DbDeal = {
    id: crypto.randomUUID(),
    user_id: input.user_id ?? USER_ID,
    property_id: input.property_id,
    client_id: input.client_id,
    property_label: input.property_label,
    client_name: input.client_name,
    deal_date: input.deal_date,
    value: input.value,
    commission_rate: input.commission_rate,
    status: input.status,
    expected_at: input.expected_at,
    received_at: input.received_at,
    notes: input.notes,
    created_at: nowIso(),
  }
  list.unshift(created)
  writeArray(KEYS.deals, list)
  return created
}

export async function updateDeal(id: string, input: Partial<DbDeal>): Promise<DbDeal> {
  const list = await fetchDeals()
  const idx = list.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('Negócio não encontrado')
  list[idx] = { ...list[idx], ...input }
  writeArray(KEYS.deals, list)
  return list[idx]
}

export async function deleteDeal(id: string): Promise<void> {
  const list = await fetchDeals()
  writeArray(KEYS.deals, list.filter((x) => x.id !== id))
}

/* ------------------------------------------------------------------ */
/* Storage (fotos de imóveis) - modo local (data URL)                */
/* ------------------------------------------------------------------ */

const BUCKET = 'property-photos'

export function isStoragePath(url?: string | null): boolean {
  return !!url && !/^https?:\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')
}

export async function uploadPropertyPhoto(propertyId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Falha ao ler foto'))
    reader.readAsDataURL(file)
  })
}

export async function deletePropertyPhoto(fileName: string): Promise<void> {
  // no-op em modo local
}

export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  return path
}

/* ------------------------------------------------------------------ */
/* Mapeadores banco <-> app                                           */
/* ------------------------------------------------------------------ */

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
    images: p.images ?? undefined,
    tags: p.tags ?? undefined,
    lat: p.lat ?? undefined,
    lng: p.lng ?? undefined,
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
    images: p.images ?? null,
    tags: p.tags ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
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
  try {
    const raw = localStorage.getItem(KEYS.profile)
    if (!raw) {
      const profile = { id: userId || USER_ID, full_name: 'Corretor', phone: null as string | null, created_at: nowIso() }
      localStorage.setItem(KEYS.profile, JSON.stringify(profile))
      return profile
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string }): Promise<{ error: string | null }> {
  const current = (await fetchProfile(userId)) ?? { id: userId || USER_ID, full_name: 'Corretor', phone: null, created_at: nowIso() }
  const updated = { ...current, ...updates }
  localStorage.setItem(KEYS.profile, JSON.stringify(updated))
  return { error: null }
}