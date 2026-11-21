import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Valida o usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id } = await req.json();

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Busca o lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Busca compromissos vinculados ao lead
    const { data: appointments } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('lead_id', lead_id)
      .eq('user_id', user.id)
      .order('starts_at', { ascending: false });

    const aiEndpoint = Deno.env.get('VITE_AI_ENDPOINT');
    const aiKey = Deno.env.get('AI_API_KEY');

    if (!aiEndpoint || !aiKey) {
      const fallback = gerarResumoLocal(lead, appointments);
      return new Response(
        JSON.stringify({ summary: fallback, source: 'local' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = montarPrompt(lead, appointments);
    const iaResponse = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um especialista em vendas imobiliárias e gestão de leads.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });

    if (!iaResponse.ok) {
      throw new Error(`Erro na IA: ${iaResponse.status}`);
    }

    const iaData = await iaResponse.json();
    const summary = iaData.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ summary, source: 'ai' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function montarPrompt(lead: any, appointments: any[]): string {
  const historico = appointments?.length
    ? appointments.map(a => `- ${a.starts_at}: ${a.title} (${a.kind})`).join('\n')
    : 'Nenhum compromisso registrado.';

  return `Resuma este lead e sugira o próximo contato:

Nome: ${lead.name}
Telefone: ${lead.phone}
E-mail: ${lead.email || 'Não informado'}
Origem: ${lead.source || 'Não informada'}
Etapa atual: ${lead.stage}
Imóvel de interesse: ${lead.property_id || 'Não informado'}
Notas: ${lead.notes || 'Nenhuma'}

Histórico de compromissos:
${historico}

Retorne: (1) resumo breve do perfil do lead, (2) estágio no funil, (3) sugestão de próximo contato com justificativa.`;
}

function gerarResumoLocal(lead: any, appointments: any[]): string {
  const historico = appointments?.length
    ? appointments.map(a => `- ${new Date(a.starts_at).toLocaleDateString('pt-BR')}: ${a.title}`).join('\n')
    : 'Nenhum compromisso registrado.';
  return `Lead ${lead.name}, etapa "${lead.stage}", origem ${lead.source || 'não informada'}.\n\nHistórico:\n${historico}\n\nSugestão: entrar em contato via WhatsApp para avançar a etapa.`;
}