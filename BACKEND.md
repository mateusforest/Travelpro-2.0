# TravelPro — backend local

Esta versão usa o portal existente com servidor Node.js 24+, SQLite e arquivos privados em disco. Não precisa instalar dependências npm. A configuração desta instalação usa http://127.0.0.1:4174 (a porta anterior estava ocupada por outra prévia). O padrão do código é 4173; .env define a porta em uso.

## Primeiro acesso

Abra cadastro.html, crie a agência e sua senha. Não existe senha padrão nem conta administrativa predefinida. Cada cadastro cria uma agência separada. Os dados demonstrativos antigos não eram persistentes e não foram importados. A nova conta começa sem clientes e viagens, com modelos de interface disponíveis.

Use `npm start` para iniciar e `npm test` para verificar. O servidor aplica as migrações de backend/migrations uma vez por banco. Não altere migrações já aplicadas; crie a próxima numerada. O servidor local permanece em 127.0.0.1 por padrão.

## O que funciona

- Cadastro, login, cookie HttpOnly/SameSite, sessões persistentes, CSRF, limite de tentativas, alteração de senha e encerramento de outras sessões.
- Dados isolados por agência. Clientes, viagens, agenda, lançamentos, roteiros, documentos, campanhas, orçamentos, leads, agente e conversas ficam gravados no servidor.
- Salvamento com versão: alterações concorrentes não substituem silenciosamente outra versão. A interface oferece exportação dos dados locais e recarga quando há conflito.
- Upload de PDF, DOCX, TXT, Markdown e imagens até 5 MB. Download exige sessão da mesma agência. TXT/Markdown alimentam o editor; PDF/DOCX ficam como originais, sem conversão de diagramação ou análise automática.
- Roteiro textual estruturado e legenda de campanha por IA, quando configurada. Resultados passam por validação e ficam salvos para revisão. Sem chave, os editores e modelos continuam disponíveis.
- COS por API com histórico: modo guiado sem chave; Responses API quando modelo e chave OpenAI forem configurados. O modelo propõe ações; os formulários confirmam e executam os registros.
- Atendimento simulado persistente e entrada real pelo webhook WhatsApp, com HMAC, deduplicação de eventos, isolamento por telefone da agência e passagem para equipe quando solicitada.
- Fila durável para preparar rascunhos de resposta de contatos reais, com tentativas e pausa quando a equipe assume. A fila aguarda a conexão de IA quando a chave está ausente. Envio real é uma ação explícita da equipe, não uma resposta automática ativada por padrão.
- Registro de envios com chave de idempotência. Falhas ambíguas ficam como `unknown`, sem repetição automática. A equipe deve verificar esses casos no provedor antes de criar outro envio.

## Chaves e integrações

Na tela Integrações, abra IA do COS, WhatsApp ou Operadora. Os segredos ficam cifrados com AES-256-GCM em integration_config. As respostas da API nunca devolvem as chaves. Campos de segredo vazios preservam o valor anterior.

A chave mestra é criada automaticamente em data/master.key, fora dos arquivos públicos. MASTER_KEY pode substituí-la por uma chave hexadecimal de 64 caracteres fornecida pelo administrador. Guarde a chave junto do backup em local protegido. Não apague nem troque sem migrar os segredos existentes.

Também é possível copiar .env.example para .env e preencher OPENAI_API_KEY e OPENAI_MODEL para uma chave global do servidor. A configuração por agência tem prioridade. Nada disso é necessário para usar os cadastros e orçamentos manuais.

### OpenAI

O servidor usa POST https://api.openai.com/v1/responses com `store:false`, modelo configurável e limite de saída. A chave nunca vai ao navegador. Referência usada: https://developers.openai.com/api/docs/guides/text. A conexão precisa ser verificada com um modelo disponível na conta. Não foram feitas chamadas pagas ou testes com credenciais reais nesta entrega.

### WhatsApp

Configuração por agência: phoneId, version (versão Graph habilitada no aplicativo Meta), token, appSecret e verifyToken. Endpoint de webhook: `/api/webhooks/whatsapp`, métodos GET e POST. A Meta precisa de URL pública HTTPS; localhost não recebe webhooks da internet.

Eventos `messages` de texto criam ou atualizam atendimento. A assinatura X-Hub-Signature-256 precisa corresponder ao corpo bruto. Eventos repetidos não duplicam a mensagem. Tipos de mídia, templates, comprovantes de entrega/leitura e cadastro automatizado Embedded Signup ainda não estão implementados. O envio de texto é limitado à janela de 24 horas após a mensagem recebida. Homologar a versão Graph e permissões no aplicativo Meta antes de ativar para clientes.

O worker local busca a fila a cada 3 segundos. Sem IA, os jobs ficam em `pending_connection`. Ao configurar a IA, eles voltam à fila. Solicitações de uma pessoa pausam o agente; a resposta só é preparada se o atendimento ainda estiver com COS e a mensagem não tiver sido substituída por outra mais recente.

### Operadora

A API da parceira ainda não foi fornecida. Existe um adaptador HTTP com autenticação Bearer e contrato explícito, não uma suposição de que todas as operadoras usam o mesmo formato. A URL configurada recebe:

```json
{"type":"quote","request":{"destination":"Itália","origin":"São Paulo","start":"2026-11-10","end":"2026-11-19","travelers":"2","category":"Conforto"}}
```

O adaptador deve devolver valores em BRL para o grupo inteiro:

```json
{"currency":"BRL","validUntil":"2026-09-20","offers":[{"id":"oferta-1","name":"Itália Conforto","description":"Descrição da operadora","total":24000,"inclusions":["Hospedagem conforme proposta"],"terms":"Condições e cancelamento conforme a tarifa"}]}
```

Mapear a API real da parceira para esse contrato e homologar autenticação, disponibilidade, tarifas, expiração e regras antes de operar. Emissão, reserva, cancelamento e pagamento não são executados por esse endpoint.

### E-mail de recuperação

Configure RESET_EMAIL_URL e RESET_EMAIL_KEY no ambiente. O gateway HTTPS recebe `{to, subject, text}` via POST JSON com Bearer e deve devolver JSON em sucesso. Os links duram 30 minutos, usam token armazenado como hash e revogam sessões após a troca. Sem gateway, o portal informa que a recuperação por e-mail está indisponível; não simula envio.

## API

- POST /api/auth/register, /login, /logout, /password, /reset-request, /reset-confirm
- GET /api/auth/session, /api/auth/sessions; DELETE /api/auth/sessions/:id
- GET/PUT /api/workspace — `{state,version}`, proteção contra conflito por versão
- GET/POST /api/records/:collection; GET/PATCH/DELETE /api/records/:collection/:id
- POST /api/files; GET /api/files/:id
- GET /api/integrations; PUT /api/integrations/:service
- POST /api/cos/chat, /api/ai/itinerary, /api/ai/campaign, /api/operator/quote, /api/whatsapp/draft, /api/whatsapp/send
- GET/POST /api/webhooks/whatsapp; GET /api/audit; GET /api/health

Escritas autenticadas exigem cookie de sessão, Origin igual ao PUBLIC_ORIGIN, Content-Type application/json e X-CSRF-Token devolvido pela sessão. Arquivos e dados são autorizados no servidor por agência. O estado operacional é um documento JSON por agência dentro do SQLite, com versão e validações de relacionamentos, valores e limites. Essa escolha preserva a interface e seus fluxos; separar em tabelas por entidade é uma evolução para consultas e escala maiores.

## Backup e operação

`data/` contém dados reais e segredos cifrados. Nunca publique, versione ou coloque essa pasta em dist. Para backup consistente, pare o servidor e copie a pasta data inteira, incluindo a chave mestra e uploads; depois reinicie. Se usar MASTER_KEY externa, faça backup dela separadamente. Teste restauração antes de usar em produção.

O projeto ainda é uma aplicação local. O Site publicado anteriormente continua sendo a versão estática; publicar apenas dist não publica este backend. Hospedagem futura exige servidor Node com disco persistente e HTTPS, ou migração deliberada para Worker/D1/R2 e autenticação compatível. Não houve publicação ou migração do Site nesta etapa.

## Limites restantes

Não estão implementados: MFA, convite e permissões de equipe, verificação de e-mail, plano/cobrança recorrente real, assinatura eletrônica, geração de imagens/vídeos, emissão/reserva e conversão automática de PDF/Word. Os planos e as frentes Travel Match/Vuei continuam sendo demonstrações. Operações financeiras internas registram lançamentos; não movimentam dinheiro.

Antes de operação pública: homologar provedores, HTTPS, política de cadastro e convites, backups restauráveis, monitoramento e limites por plano. As conexões externas não foram testadas com chaves reais. Os testes usam bancos temporários isolados e mensagens de webhook sintéticas, sem enviar mensagens a pessoas.
