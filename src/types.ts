export type PropertyStatus = 'Disponível' | 'Em negociação' | 'Vendido' | 'Alugado'
export type Property = {
  id: string; code: string; title: string; type: string; purpose: 'Venda' | 'Aluguel'
  price: number; city: string; neighborhood: string; bedrooms: number; bathrooms: number
  area: number; status: PropertyStatus; image_url?: string | null
  images?: string[] | null
  lat?: number | null; lng?: number | null
  tags?: string[] | null
  description?: string | null; address?: string | null; user_id?: string; created_at?: string
}
export type Client = { id: string; name: string; email: string; phone: string; interest: string; budget: number; notes?: string | null; user_id?: string; created_at?: string }
export type Lead = { id: string; name: string; phone: string; email?: string | null; source: string; stage: string; property?: string | null; property_id?: string | null; notes?: string | null; user_id?: string; created_at?: string }
export type Appointment = { id: string; title: string; client: string; client_id?: string | null; lead_id?: string | null; property_id?: string | null; date: string; time: string; kind: string; starts_at?: string | null; notes?: string | null; user_id?: string; created_at?: string }
export type Deal = { id: string; property: string; property_id?: string | null; client: string; client_id?: string | null; value: number; commission_rate: number; status: string; date: string; expected_at?: string | null; received_at?: string | null; notes?: string | null; user_id?: string; created_at?: string }
export type UserProfile = { id: string; full_name: string; phone?: string | null; created_at?: string }
export type AuthUser = { id: string; email: string; full_name?: string }
