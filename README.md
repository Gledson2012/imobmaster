# ImobMaster

Aplicativo PWA em React + TypeScript para corretor autônomo. Interface dark responsiva, com módulos de imóveis, clientes, leads (pipeline), agenda, financeiro, relatórios e configurações.

> **Estado desta entrega:** aplicativo 100% gratuito e offline. Todos os dados (imóveis, clientes, leads, agenda, negócios e perfil) são persistidos localmente no navegador (localStorage), sem servidor externo, sem conta e sem custo. WhatsApp abre conversas por link `wa.me`. A IA (copy de anúncios e resumo de leads) é gerada localmente no navegador, sem chamada externa e sem chave de API.

## Requisitos

- Node.js 20 ou superior (recomendado)
- npm

Nenhum serviço externo é necessário: o app funciona 100% offline e gratuito.

## Executar localmente

```bash
unzip imobmaster.zip
cd imobmaster
npm install
cp .env.example .env
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`.

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Configurar Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`.
3. Em **Project Settings > API**, copie Project URL e a chave `anon`/publishable.
4. Preencha o `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

5. Reinicie o servidor Vite.

**Segurança:** nunca coloque `service_role` ou chave privada no frontend. As tabelas possuem RLS e políticas por `auth.uid()`. O `user_id` dos registros é aplicado pelo próprio banco (`default auth.uid()`); o frontend não envia esse campo.

## Configurar IA (Edge Functions)

As funções ficam em `supabase/functions/` e exigem usuário autenticado (o token da sessão é repassado pelo `supabase.functions.invoke`).

1. Instale a CLI do Supabase e faça login: `supabase login`.
2. Vincule ao projeto: `supabase link --project-ref SEU-PROJECT-REF`.
3. Publique as funções:

```bash
supabase functions deploy generate-property-copy lead-summary
```

4. (Opcional, para IA real) Configure os secrets do provedor — compatível com a API de chat completions da OpenAI:

```bash
supabase secrets set AI_API_KEY=*** VITE_AI_ENDPOINT=https://api.openai.com/v1/chat/completions
```

Sem esses secrets, as funções retornam texto gerado localmente (`source: "local"`), sem custo e sem chamada externa. Com eles, a resposta vem do modelo (`source: "ai"`). A chave do provedor fica somente no servidor.

## Funcionalidades incluídas

- Autenticação Supabase (cadastro, login, recuperação de senha, logout) com perfil automático
- Dashboard com indicadores, gráfico, compromissos, imóveis e leads recentes
- CRUD real de imóveis, clientes, leads, compromissos e negócios (persistido no Supabase)
- Pipeline de leads com mudança de etapa
- Agenda de visitas, captações e retornos
- Estimativa de comissões
- Atalhos de WhatsApp para clientes/leads com telefone cadastrado
- IA: geração de copy de anúncios (imóveis) e resumo de leads com sugestão de próximo contato, via Edge Functions com fallback local
- Upload de fotos de imóveis (bucket `property-photos`, políticas Storage por usuário)
- PWA instalável e cache básico de assets
- Row Level Security: cada corretor acessa somente os próprios registros

## Próximas integrações para produção

- WhatsApp Business Platform/Cloud API para mensagens automatizadas. `wa.me` apenas abre o aplicativo e não envia mensagens automaticamente.
- IA: as Edge Functions já estão implementadas; para produção, configure `AI_API_KEY`/`VITE_AI_ENDPOINT` e revise limites de uso e custos do provedor.
- Testes automatizados, logs, backups e revisão de segurança antes de publicar.

## Estrutura

```text
src/
  components/       # Layout, navegação e modal
  data/             # Dados demonstrativos
  lib/              # Cliente Supabase
  pages/            # Dashboard e módulos
  types.ts
  App.tsx
  main.tsx
  styles.css
supabase/
  schema.sql
  functions/          # Edge Functions de IA (Deno)
public/icons/
```

## Referências oficiais

- React: https://react.dev/
- Vite: https://vite.dev/
- Supabase: https://supabase.com/docs
- PWA: https://developer.mozilla.org/docs/Web/Progressive_web_apps
