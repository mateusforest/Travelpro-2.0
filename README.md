# TravelPro

Aplicação local para agências de viagem, com landing page, portal, COS e frente de atendimento WhatsApp.

## Abrir

A instalação atual funciona em http://127.0.0.1:4174. Execute `npm install` e `npm start`. Com as três variáveis do Supabase preenchidas no `.env`, entre em `login.html` usando sua conta existente do Supabase. `cadastro.html` cria uma nova conta. Não há senha padrão.

Login, cadastros, viagens, agenda, documentos, roteiros, financeiro, orçamentos, leads e conversas ficam salvos por agência no servidor. Integrações reais recebem suas chaves depois, pela tela Integrações. Sem chaves, o COS funciona em modo guiado, as cotações podem ser ilustrativas e os editores manuais continuam disponíveis.

Consulte [DEPLOY.md](DEPLOY.md) para publicar na Vercel com Supabase e [BACKEND.md](BACKEND.md) para os contratos dos provedores e o modo SQLite local. O arquivo `.env.example` contém as opções de ambiente. Requer Node.js 24 ou superior.

## Estado da entrega

O financeiro possui contas e saldos, categorias, clientes/fornecedores, parcelas, baixas parciais, estornos, transferências internas, fluxo de caixa e exportação CSV. Veja [o guia financeiro](docs/financeiro.md), incluindo a migração do histórico anterior e a preparação para o Granatum.

A [integração Granatum](docs/granatum.md) importa o histórico e os compromissos futuros já disponíveis, com atualização periódica e credencial cifrada por agência.

O portal usa a mesma API `/api/` localmente e na Vercel. Supabase fornece autenticação, sessões, banco e arquivos privados. Sem as três variáveis do Supabase, o servidor local usa o SQLite anterior; as contas e dados de SQLite não são migrados automaticamente. IA e operadora dependem da configuração das integrações. No modo Supabase, os rascunhos do WhatsApp são processados durante a invocação do webhook, sem a fila persistente do modo SQLite.

Pagamentos, assinatura eletrônica, MFA, geração de imagens/vídeos e emissão de viagens ainda não estão implementados. Planos, Travel Match e Vuei seguem como demonstrações. O financeiro registra lançamentos internos sem movimentar dinheiro.

## Créditos das fotografias

- Positano: Ricardo Gomez Angel / Unsplash — https://unsplash.com/photos/village-in-shallow-focus-photography-2AQtPacdfp8
- Roma: Mathew Schwartz / Unsplash — https://unsplash.com/photos/the-colosseum-rome-Kyxejaf39vM
- Florença: Tom Podmore / Unsplash — https://unsplash.com/photos/a-view-of-a-city-with-a-river-running-through-it-AVQUqyNYZMM
- Licença: https://unsplash.com/license

Logo e ícone fornecidos pelo proprietário. As fotografias estão salvas localmente; Google Fonts possui alternativas de sistema.
