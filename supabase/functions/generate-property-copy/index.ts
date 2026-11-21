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

    const { property_id, tone = 'profissional' } = await req.json();

    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'property_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Busca os dados do imóvel
    const { data: property, error: propError } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .eq('user_id', user.id)
      .single();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ error: 'Imóvel não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiEndpoint = Deno.env.get('VITE_AI_ENDPOINT');
    const aiKey = Deno.env.get('AI_API_KEY');

    if (!aiEndpoint || !aiKey) {
      // Modo fallback: retorna copy gerado localmente sem chamada de IA
      const fallbackCopy = gerarCopyLocal(property, tone);
      return new Response(
        JSON.stringify({ copy: fallbackCopy, source: 'local' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chama o provedor de IA
    const prompt = montarPrompt(property, tone);
    const iaResponse = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um especialista em copy imobiliário.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!iaResponse.ok) {
      throw new Error(`Erro na IA: ${iaResponse.status}`);
    }

    const iaData = await iaResponse.json();
    const copy = iaData.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ copy, source: 'ai' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function montarPrompt(p: any, tone: string): string {
  return `Escreva um anúncio imobiliário atraente para o seguinte imóvel:

Título: ${p.title}
Tipo: ${p.property_type}
Finalidade: ${p.purpose}
Cidade/Bairro: ${p.city} - ${p.neighborhood}
Quartos: ${p.bedrooms} | Banheiros: ${p.bathrooms} | Área: ${p.area} m²
Preço: R$ ${Number(p.price).toLocaleString('pt-BR')}${p.purpose === 'Aluguel' ? '/mês' : ''}
Status: ${p.status}
Descrição atual: ${p.description || 'Não informada'}

Tom de voz: ${tone}

Retorne apenas o texto do anúncio, pronto para publicar, com emojis e chamada para ação.`;
}

function gerarCopyLocal(p: any, tone: string): string {
  const tonos: Record<string, string> = {
    profissional: 'Excelente oportunidade de investimento.',
    descontraído: 'Que tal esse imóvel incrível?',
    elegante: 'Um imóvel de requinte para clientes exigentes.',
  };
  const tom = tonos[tone] || tonos.profissional;
  return `${tom} ${p.title} em ${p.neighborhood}, ${p.city}. ${p.bedrooms} quartos, ${p.bathrooms} banheiros, ${p.area} m². ${p.purpose === 'Venda' ? 'À venda por' : 'Para aluguel por'} R$ ${Number(p.price).toLocaleString('pt-BR')}. Agende sua visita!`;
}