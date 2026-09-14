# TravelPro

Aplicação local para agências de viagem, com landing page, portal, COS e frente de atendimento WhatsApp.

## Abrir

A instalação atual funciona em http://127.0.0.1:4174. Comece em cadastro.html para criar sua agência. Não há conta ou senha padrão.

Login, cadastros, viagens, agenda, documentos, roteiros, financeiro, orçamentos, leads e conversas ficam salvos por agência no servidor. Integrações reais recebem suas chaves depois, pela tela Integrações. Sem chaves, o COS funciona em modo guiado, as cotações podem ser ilustrativas e os editores manuais continuam disponíveis.

Consulte [BACKEND.md](BACKEND.md) para configuração, APIs, contratos dos provedores, testes, backup e limites da versão. O arquivo .env.example contém as opções de ambiente. Node.js 24 ou superior; não são necessárias dependências npm.

## Estado da entrega

O backend local está implementado e ligado às telas. IA conversacional, geração de roteiro textual e legenda possuem adaptador OpenAI. WhatsApp possui webhook autenticado, fila de rascunhos e envio explícito. A operadora precisa de um adaptador para sua API específica. Não houve testes com chaves reais ou publicação desta versão.

Pagamentos, assinatura eletrônica, MFA, geração de imagens/vídeos e emissão de viagens ainda não estão implementados. Planos, Travel Match e Vuei seguem como demonstrações. O financeiro registra lançamentos internos sem movimentar dinheiro.

## Créditos das fotografias

- Positano: Ricardo Gomez Angel / Unsplash — https://unsplash.com/photos/village-in-shallow-focus-photography-2AQtPacdfp8
- Roma: Mathew Schwartz / Unsplash — https://unsplash.com/photos/the-colosseum-rome-Kyxejaf39vM
- Florença: Tom Podmore / Unsplash — https://unsplash.com/photos/a-view-of-a-city-with-a-river-running-through-it-AVQUqyNYZMM
- Licença: https://unsplash.com/license

Logo e ícone fornecidos pelo proprietário. As fotografias estão salvas localmente; Google Fonts possui alternativas de sistema.
