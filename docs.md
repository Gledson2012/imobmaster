# Guia de integração

## Tabelas e módulos
- `properties`: catálogo de imóveis e anúncios.
- `clients`: compradores, locatários e proprietários.
- `leads`: oportunidades e etapa do funil.
- `appointments`: visitas, captações e retornos.
- `deals`: negociação e comissão estimada.
- `profiles`: dados do corretor autenticado.

## Endpoints de IA (implementados)
Edge Functions em `supabase/functions/`, autenticadas pelo token do usuário (RLS aplicado nas consultas):
- `POST /functions/v1/generate-property-copy` — recebe `{ property_id, tone }`, valida o usuário, busca o imóvel do próprio corretor e retorna `{ copy, source: 'ai' | 'local' }`.
- `POST /functions/v1/lead-summary` — recebe `{ lead_id }`, busca o lead e seus compromissos e retorna `{ summary, source: 'ai' | 'local' }` com sugestão de próximo contato.

Secrets do servidor: `AI_API_KEY` e `VITE_AI_ENDPOINT` (endpoint compatível com chat completions da OpenAI). Sem eles, as funções usam fallback local. A resposta é estruturada e validada. Não envie dados pessoais desnecessários ao provedor de IA.

## WhatsApp
Links `https://wa.me/55DDDNUMERO?text=...` podem iniciar conversa com consentimento do usuário. Envio proativo, templates e automação exigem WhatsApp Business Platform e regras de opt-in.
