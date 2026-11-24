import { fetchProperties, fetchLeads, fetchAppointments } from './supabase'

/* ------------------------------------------------------------------ */
/* IA local (100% gratuito, sem chamada externa)                      */
/* ------------------------------------------------------------------ */

export async function generatePropertyCopy(propertyId: string, tone: string = 'profissional'): Promise<{ copy: string; source: 'ai' | 'local'; error?: string }> {
  try {
    const props = await fetchProperties()
    const p = props.find((x) => x.id === propertyId)
    if (!p) return { copy: '', source: 'local', error: 'Imóvel não encontrado' }

    const tonos: Record<string, string> = {
      profissional: 'Excelente oportunidade de investimento.',
      descontraído: 'Que tal esse imóvel incrível?',
      elegante: 'Um imóvel de requinte para clientes exigentes.',
    }
    const tom = tonos[tone] || tonos.profissional
    const copy = `${tom} ${p.title} em ${p.neighborhood ?? ''}, ${p.city}. ${p.bedrooms} quartos, ${p.bathrooms} banheiros, ${p.area} m². ${p.purpose === 'Venda' ? 'À venda por' : 'Para aluguel por'} R$ ${Number(p.price).toLocaleString('pt-BR')}. Agende sua visita!`
    return { copy, source: 'local' }
  } catch (err: any) {
    return { copy: '', source: 'local', error: err?.message || 'Erro ao gerar copy' }
  }
}

export async function leadSummary(leadId: string): Promise<{ summary: string; source: 'ai' | 'local'; error?: string }> {
  try {
    const leads = await fetchLeads()
    const lead = leads.find((x) => x.id === leadId)
    if (!lead) return { summary: '', source: 'local', error: 'Lead não encontrado' }

    const appointments = await fetchAppointments()
    const related = appointments.filter((a) => a.lead_id === leadId)
    const historico = related.length
      ? related.map((a) => `- ${new Date(a.starts_at).toLocaleDateString('pt-BR')}: ${a.title}`).join('\n')
      : 'Nenhum compromisso registrado.'
    const summary = `Lead ${lead.name}, etapa "${lead.stage}", origem ${lead.source || 'não informada'}.\n\nHistórico:\n${historico}\n\nSugestão: entrar em contato via WhatsApp para avançar a etapa.`
    return { summary, source: 'local' }
  } catch (err: any) {
    return { summary: '', source: 'local', error: err?.message || 'Erro ao gerar resumo' }
  }
}