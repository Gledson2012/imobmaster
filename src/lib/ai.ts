import { supabase } from './supabase'

/* ------------------------------------------------------------------ */
/* Serviço de IA via Edge Functions do Supabase                       */
/* ------------------------------------------------------------------ */

export async function generatePropertyCopy(propertyId: string, tone: string = 'profissional'): Promise<{ copy: string; source: 'ai' | 'local'; error?: string }> {
  if (!supabase) {
    return { copy: '', source: 'local', error: 'Supabase não configurado' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-property-copy', {
      body: { property_id: propertyId, tone },
    })

    if (error) throw error
    return data as { copy: string; source: 'ai' | 'local' }
  } catch (err: any) {
    return { copy: '', source: 'local', error: err?.message || 'Erro ao gerar copy' }
  }
}

export async function leadSummary(leadId: string): Promise<{ summary: string; source: 'ai' | 'local'; error?: string }> {
  if (!supabase) {
    return { summary: '', source: 'local', error: 'Supabase não configurado' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('lead-summary', {
      body: { lead_id: leadId },
    })

    if (error) throw error
    return data as { summary: string; source: 'ai' | 'local' }
  } catch (err: any) {
    return { summary: '', source: 'local', error: err?.message || 'Erro ao gerar resumo' }
  }
}
