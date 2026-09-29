# COS — entrada por conversa ou print

## Experiência da agência

Na tela Hoje, a agente cola uma conversa, cola uma imagem da área de transferência ou seleciona um print PNG/JPEG/WebP de até 3 MiB. A análise apresenta um resumo, avisos e campos editáveis. Ela escolhe entre cadastrar somente o cliente ou criar também o atendimento e confirma a execução.

O cliente pode ser selecionado entre os existentes; seus dados não são sobrescritos. Informações de viagem desconhecidas ficam a confirmar. Datas sem ano explícito não devem ser completadas pela IA. A análise não cadastra, envia mensagens, reserva viagens nem movimenta valores.

Nesta primeira entrega, as ações disponíveis são cadastro de cliente e abertura de atendimento. Geração de proposta a partir de cotação, agendamento por linguagem natural e comandos internos via WhatsApp são extensões futuras.

## Conexões e responsabilidades

- A equipe TravelPro configura COS, adaptador da operadora e credenciais técnicas do WhatsApp. A agência vê estados de disponibilidade, sem chaves, modelos ou endereços técnicos.
- O WhatsApp Business existente é a frente de conversa com os clientes. Um número para a agente conversar com o COS é outro fluxo, ainda não implementado; exigirá identificação da agente, escopo da agência e confirmação das ações.
- Reservas e pagamentos seguem na operadora. Não há gateway a configurar pela agência nesta proposta de operação.
- Assinatura eletrônica aparece em estudo; Open Finance permanece planejado.

## Implementação

`POST /api/cos/intake/analyze` recebe `{text,image?}`. Faz uma leitura multimodal com Structured Outputs e retorna `{draft,summary,warnings,mode}`. Não salva o material na agência. Texto e imagem são enviados ao provedor somente quando a pessoa solicita análise; usa `store:false`. Isso não é uma promessa sobre políticas de retenção do provedor.

`POST /api/cos/intake/execute` recebe `{version,review}`. `review` inclui identificador de operação, ação, cliente existente opcional e campos revisados. Somente campos permitidos são aceitos. A gravação usa controle de versão e registra o identificador da operação, hash e IDs resultantes. Repetir a mesma confirmação retorna os registros anteriores; reutilizar a confirmação com conteúdo diferente é recusado.

E-mails e telefones já presentes exigem selecionar o cliente existente. O registro de confirmação é preservado no servidor; o salvamento comum do portal não pode apagá-lo ou forjá-lo. Em um reenvio, alterações mais recentes do servidor não são sobrescritas por uma cópia local antiga. Uma revisão em andamento avisa antes de fechar/recarregar a página. Ela não é recuperada automaticamente após encerrar o navegador.

Credenciais são configuradas no servidor ou por administradores explicitamente incluídos em `TRAVELPRO_PLATFORM_ADMIN_IDS`. Ser proprietário da agência não concede esse acesso. A autorização mantém o escopo da agência à qual a conta já pertence; esta entrega não cria um painel global de seleção de agências.

## Ativação e verificação

O modelo escolhido em `OPENAI_MODEL` (ou configuração administrada) precisa aceitar imagens e Structured Outputs. A extração permanece indisponível quando faltam chave/modelo; o portal oferece revisão manual identificada, sem simular OCR. A configuração registrada não comprova que o provedor funciona.

Testes usam respostas controladas e bases isoladas, cobrindo análise sem gravação, dados inválidos, imagens, revisão, idempotência, isolamento, permissões e conflitos. A qualidade da extração real ainda precisa de homologação com amostras autorizadas de conversas e cotações após ativação central da IA. Nenhum print de cliente real foi enviado durante esta implementação.

Referências de implementação: [Images and vision](https://developers.openai.com/api/docs/guides/images-vision) e [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), documentação oficial da OpenAI consultada em 26/09/2026.

## Assinatura eletrônica: próximo experimento

A candidata inicial para teste é a ZapSign: sua API recebe documentos, permite associar um identificador interno e devolve um link de assinatura. O fluxo proposto é revisar o contrato no atendimento, gerar o link, acompanhar a assinatura e arquivar a versão final. O contrato só deve ser marcado como concluído quando o documento inteiro estiver assinado; o evento de um signatário isolado não basta. Os links de download recebidos expiram, portanto o arquivo final precisa ser armazenado com acesso restrito.

O primeiro teste deve usar documentos fictícios no ambiente de testes. Esta entrega não conecta o provedor, não envia contratos e não contrata um plano. É necessário avaliar custo, autenticação dos signatários e compatibilidade com os contratos da agência antes da escolha definitiva.

Fontes oficiais: [criar documento e link](https://docs.zapsign.com.br/documentos/criar-documento), [evento de assinatura](https://docs.zapsign.com.br/webhooks/eventos/document/documento-assinado) e [ambiente de testes](https://docs.zapsign.com.br/ambiente-de-testes).
