# Auditoria geral do TravelPro — 24/10/2026 UTC

**Escopo:** https://www.usetravelpro.com, código de `mateusforest/Travelpro-2.0` a partir de `1c6b4a8`, autenticação, acesso a dados, sessões, módulos do portal e integrações. A coleta começou em 23/10 no horário de Brasília.

**Conclusão:** a base de gestão tem fluxos persistentes e testes de isolamento, mas a plataforma ainda não representa uma operadora completa com emissão e pagamento integrados. Há funções prontas no código que dependem de ativação externa e funcionalidades explicitamente não implementadas. As correções deste conjunto tratam falhas de sessão, renderização e tratamento de requisições; não ativam fornecedores nem contratam serviços.

## Evidência e limites

- Baseline: 353 testes existentes passaram antes das alterações. Após as correções: **368 testes passaram**, zero falhas; sintaxe validada em 59 arquivos, inicialização serverless aprovada e diff sem erros de whitespace.
- 31 páginas públicas responderam HTTP 200; referências locais de scripts, estilos, imagens e links dessas páginas sem arquivos ausentes. Isso verifica entrega de arquivos, não comprova todas as interações.
- O navegador redirecionou `/portal.html` para `/login.html` sem uma sessão autenticada. Não havia conta conectada para testar o portal privado em produção.
- Oito APIs privadas consultadas sem credenciais retornaram 401: sessão, workspace, integrações, financeiro, catálogo de busca, sessão WhatsApp, arquivos e sessões de acesso.
- Verificação de dependências de produção: `npm audit --omit=dev`, zero vulnerabilidades conhecidas reportadas. Isso não equivale à ausência de falhas no aplicativo.
- Testes locais usam contas/bancos descartáveis, jsdom e substitutos isolados do Supabase; não enviam mensagens, não alteram clientes de produção e não criam reservas ou cobranças.
- Não foram testados em produção: entrega de e-mail de confirmação/recuperação, login com credenciais reais, administração do Supabase, backups/restauração, QR com telefone real, emissões e transações bancárias. A exportação nativa de vídeo ainda precisa de validação em navegador compatível; o download do Chromium falhou nesta sessão.
- A execução sofreu uma interrupção temporária do ambiente e foi retomada. As consultas externas com falha foram repetidas; os dois resultados estão preservados na evidência resumida.

## Problemas encontrados e correções

| Prioridade | Problema observado | Correção neste conjunto | Evidência |
|---|---|---|---|
| Alta | Identificadores aceitos no estado eram interpolados sem escape em atributos HTML; imagens e alguns campos textuais também permitiam interpolação insegura. | Escape dos identificadores e campos identificados; rejeição de caracteres de marcação em identificadores persistidos. | Regressão com identificador malicioso: nenhum elemento/evento injetado no DOM; servidor rejeita o estado. Não é certificação de todos os pontos de renderização. |
| Alta | Recarregar o portal reiniciava a contagem de inatividade no navegador. | Marca de atividade persistida por sessão opaca; reabertura não renova o prazo. Sessão bloqueada não reabre com o mesmo identificador. | Testes de reload, atividade real, polling, novo login e falha de rede. |
| Alta | Logout e expiração em uma aba não ocultavam imediatamente os dados nas outras. | Propagação de bloqueio por BroadcastChannel e evento de armazenamento; DOM ocultado antes da chamada de rede; resposta 401 bloqueia a tela. | Testes de múltiplas abas, isolamento entre sessões e encerramento offline. Armazenamento não contém tokens nem dados de clientes. |
| Média | Conflito de gravação impedia usar Sair; associação revogada à agência também impedia logout no Supabase. | Logout separado das alterações de workspace e da associação à agência. Se há gravação pendente que falhou, permite cancelar para exportar ou sair conscientemente. | Regressões de conflito, cancelamento e associação revogada. |
| Média | Navegar por hash durante falha no carregamento podia renderizar dados demonstrativos. | Renderização e ações dependem do carregamento autenticado. | Regressão de falha de autenticação seguida de navegação e ação de relatório. |
| Média | Simular uma mensagem para um telefone real reutilizava e alterava a conversa real. | Simulação procura somente conversas de teste; conversa real não oferece o botão de simular. | Conversa real preservada byte a byte e simulação salva separadamente. |
| Média | Páginas estáticas sem proteção global contra enquadramento e sem política de conteúdo básica. | Cabeçalhos globais de frame, MIME, referência, base, objetos e envio de formulários. | Verificação de configuração e conferência HTTP após publicação. CSP básica: ainda não restringe scripts por nonce. |
| Baixa | JSON inválido retornou 503 em produção quando a camada Vercel tentou decodificar o corpo. | Captura específica de erro do parser antes de entrar no aplicativo; retorna 400. | Regressão no adaptador serverless com getter de corpo que lança SyntaxError. |
| Baixa | Webhook WA-AKG sem assinatura e agência inválida alcançava consulta UUID e retornava 500. | Rejeita assinatura ausente/malformada antes do banco; valida UUID do destino. | Regressão sem consultas ao banco, além dos testes existentes de HMAC, sessão e repetição. |

## Revisão por seção

| Seção | O que foi verificado | Situação e trabalho restante |
|---|---|---|
| Landing e navegação | Páginas, referências locais, proteção de entrada e renderização das seções principais. | Entrega pública funcionando. Responsividade e todas as interações privadas não homologadas visualmente nesta auditoria. |
| Login e cadastro | Validação, cookies HttpOnly/Secure/SameSite, escopo de agência, confirmação de cadastro e fluxos locais de conta. | Implementados. Confirmar entrega de e-mail, URLs de callback e login real no Supabase em produção. |
| Recuperação e troca de senha | Token/cookie de recuperação com usuário, assinatura e prazo; senha atual para troca; revogação de outros acessos solicitada ao provedor. | Implementados em código. E-mail de recuperação e comportamento dos dispositivos reais ainda não homologados. |
| Segurança e sessões | Isolamento de agência, perfis de gestão, CSRF/origem, expiração, logout e sessões. | Correções acima. Supabase lista somente a sessão atual; MFA, inventário completo de dispositivos e revogação individual não implementados. |
| Hoje, clientes e atendimentos | Cadastro, vínculos, anexos, exclusão preservando histórico, duplicação, relatórios e conflitos de versão. | Fluxos testados localmente. Uma agência usa estado JSON com gravação otimista: edição simultânea exige resolução de conflito. |
| Agenda | Eventos, aniversários, vínculos e navegação de datas. | Gestão interna testada. Não há sincronização homologada com calendários externos nem disparo automático de lembretes. |
| Cotação e organizador | Consultas reais públicas, normalização, validade, limites, separação de alternativas, margem privada e histórico. | Busca funciona no recorte descrito abaixo. Cobertura de destinos/provedores limitada; ofertas publicadas não garantem datas, ocupação ou emissão. APIs pagas dependem de credenciais. |
| Propostas e PDF | Composição, valores, marca, privacidade de comissão, geração e validações do envio. | Fluxo local testado. Envio real depende de sessão WhatsApp conectada; aprovação não implica reserva, pagamento ou emissão externa. |
| Reservas, pagamentos e emissão | Estados e travas do fluxo comercial, preservação de referências e pré-condições para roteiro. | Organização interna existe. Não há emissão universal nem adquirência integrada. O endpoint de pagamentos retorna 501. |
| Roteiros e modelos | PDF original privado, extração, edição, campos, versões e vínculos com viagem. | Fluxos locais testados. Extração por IA depende de configuração; conteúdo extraído exige revisão. |
| Documentos e assinatura | Arquivos privados por agência, limites, versões, vínculos e rascunho de signatários. | Documentos implementados. Clicksign não ativado; assinatura externa retorna 501 e rascunho não é assinatura. |
| Financeiro e comissão | Centavos, parcelas, pagamentos parciais, estornos, transferências, isolamento, relatórios e Granatum em testes. | Gestão interna testada. Confirmar conexão/sincronização Granatum da agência; Open Finance/Pluggy pendente. Não confundir lançamento interno com liquidação bancária. |
| COS, entrada inteligente e leads | Histórico, análise/revisão, execução idempotente, criação de vínculos e atendimento humano. | Fluxo guiado disponível. IA depende de chave/modelo configurados. O canal de comando pessoal da agente pelo WhatsApp ainda não foi implementado. |
| WhatsApp e agente | Adaptador WA-AKG, QR, status, escopo, webhook HMAC, deduplicação, rascunhos e controle humano. | Integração preparada e testada com substitutos. Host persistente, credenciais e pareamento real continuam pendentes de comprovação; nenhuma mensagem real enviada. Download/leitura de anexos recebidos e conciliação de envios incertos exigem evolução. |
| Studio e marketing | Seis formatos, upload, campanha persistente, duplicação, legenda e estrutura de exportação. | PNG e vídeo com foto/texto implementados. Validar o arquivo de vídeo nativo no navegador; MP4 depende de suporte, com alternativa WebM. Sem áudio, filmagem por IA, publicação automática ou agendamento nas redes. Endpoint de geração externa retorna 501. |
| Conexões, configurações, plano e faturamento | Separação de administrador de plataforma e agência, segredos cifrados, preferências e informações exibidas. | Configuração salva não prova conexão. Plano/faturamento ainda não realizam assinatura/cobrança real. |
| Travel Match e Vuei | Fluxos de autorização, escopo de registros e proteção de intercâmbio em testes isolados. | Não houve homologação ponta a ponta entre contas reais dos três produtos. |

## Busca real: resultado da repetição

Datas solicitadas: 26/11 a 01/12/2026, dois adultos. Cinco cenários independentes; não somar resultados como pacote contratado.

| Consulta | Resultado | Interpretação |
|---|---:|---|
| Hotel Laghetto Rio Grande | 5 | Tarifas de quartos para o período e ocupação; alternativas, não cinco hotéis diferentes. Sujeitas a revalidação. |
| GOL e Azul, POA → CGH | 27 | Ofertas publicadas; não confirmam disponibilidade para as datas solicitadas. |
| Civitatis e Siga, Porto Alegre | 41 | Referências de passeios/serviços; GetYourGuide falhou nesta consulta. |
| Tiqets, Paris | 7 | Referências de ingressos; disponibilidade e participantes a confirmar. |
| Movida Pré-Pago, São Paulo | 3 | Pacotes pré-pagos; não equivalem a reserva de carro por período. |
| Total | 83 | 5 resultados classificados como completos pelo normalizador e 78 referências publicadas. Nenhuma compra/reserva feita. |

Na primeira rodada, somente Laghetto e Azul responderam, com sete resultados. A repetição recuperou cinco outras fontes; GetYourGuide continuou com erro. A causa exata desse erro não foi comprovada. O status por fonte deve permanecer visível e disponibilidade variável exige monitoramento; não deve ser vendida como cobertura universal.

## Pendências prioritárias

1. **Confirmar proteção de inatividade no servidor:** aplicar/verificar `20260929_session_activity.sql` e `TRAVELPRO_SERVER_IDLE_ENFORCEMENT=true`. O código deixa essa proteção condicional; sem acesso à configuração autenticada, não é possível afirmar seu estado atual. A tela passa a informar o sinal retornado pelo servidor. O bloqueio no navegador não substitui a verificação no backend.
2. **Homologar autenticação em produção:** confirmação e recuperação por e-mail, login e logout entre dispositivos, duração real de tokens, política de cadastro e restauração de backup. Não ativar configurações que possam bloquear contas sem conferir a migração.
3. **Completar gestão de acesso:** MFA, dispositivos reais, revogação individual, política de permissões mais granular e seleção explícita para usuários com múltiplas agências. Hoje o acesso escolhe uma agência elegível automaticamente.
4. **Ativar e homologar WA-AKG:** host contínuo, chave, QR do responsável, recebimento, revisão de rascunho e envio autorizado; observar reconexão e mensagens com estado incerto.
5. **Fechar o ciclo comercial externo:** fornecedores contratados, revalidação de preço, reserva/emissão, cobrança/boletos e reconciliação. APIs 501 não representam operação concluída.
6. **Homologar Studio:** exportar/abrir vídeos reais, verificar compatibilidade de upload nas redes e decidir provedor de mídia/publicação. Imagens repetidas no estado da agência também exigem evolução de armazenamento para campanhas maiores.
7. **Fortalecer operação e segurança:** CSP com scripts restritos, revisão adicional de todos os pontos de HTML, monitoramento de erros/fontes, teste de recuperação e proteção contra abuso. O cliente HTTP de integrações configuráveis valida DNS antes de `fetch`, mas não fixa o mesmo endereço no socket; endurecimento recomendado. Configuração é restrita ao administrador de plataforma. O coletor nativo possui transporte com endereço fixado fora do proxy gerenciado.

## Comandos de verificação

`NODE_OPTIONS=--no-experimental-require-module npm test`

`npm run check`

`node scripts/verify-serverless-startup.mjs`

`git diff --check`

`node scripts/verify-native-search.mjs --output <arquivo.json>`

A evidência resumida acompanha este documento em `auditoria-evidencias-2026-10-24.json`. A aprovação dos testes não elimina as limitações de produção e integração descritas acima.
