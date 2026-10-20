# WhatsApp por QR Code e Studio — 20/10/2026

## O que está implementado

O caminho de configuração de WhatsApp no portal passa a ser WA-AKG, com QR Code. O servidor não usa a Graph API quando `provider=wa-akg`. A compatibilidade antiga permanece apenas para configurações existentes; não é oferecida para novas conexões na interface.

- Configuração técnica: endpoint HTTPS + chave `X-API-Key`, cifrada por agência. Cada agência recebe o ID determinístico `travelpro-{workspaceId}`. Não há seletor de sessão de outra agência.
- O responsável da agência acessa Conexões → Conectar por QR Code, cria a sessão, registra o recebimento, inicia, exibe o QR e consulta a conexão. Membros comuns não controlam sessões em produção. Criar a sessão não significa conectar o telefone.
- QR somente no diálogo, sem persistência ou logs. A imagem é retirada após 45 segundos; o responsável pode renová-la. Status conectado exige instância ativa, status CONNECTED e identificação do próprio número.
- Webhook HMAC SHA-256 com assinatura do corpo original, sessão correspondente e timestamp de até cinco minutos. URL vinculada ao workspace; nunca confia em agência enviada no corpo. Repetições de uma mensagem já presente no histórico não criam outro lead ou rascunho.
- Mensagens individuais entram em Conversas; grupos, status, mensagens próprias e identidades LID ainda não resolvidas para telefone são ignorados. Contato pode criar ou reutilizar cliente. Anexos são sinalizados no texto: a leitura/download de mídia recebida não foi implementada.
- COS prepara rascunho quando OpenAI está configurada e a opção está habilitada. Nunca envia automaticamente. Pedido de pessoa pausa o agente; rascunho gerado para mensagem anterior não sobrescreve conversa alterada. O início da sessão coloca bot e autorrespostas da WA-AKG em SPECIFIC com listas vazias, evitando resposta paralela do gateway.
- Resposta e PDF usam a sessão da agência e exigem confirmação com ID da mensagem. Resultado incerto não é reenviado automaticamente. O envio de proposta por WA-AKG não aplica a janela de 24 horas da API Meta; exige contato vinculado a conversa real aberta na mesma sessão.
- O canal interno para a agente conversar com o COS pelo seu WhatsApp pessoal continua separado e não foi ativado. Não há identidade/autorização desse canal implementada.

## Ativação externa pendente

A versão do portal, sozinha, não hospeda a WA-AKG. Ela usa processo persistente, conexão WebSocket e armazenamento das sessões. O projeto TravelPro está em funções Vercel; o gateway deve rodar em outro host contínuo. Nenhum host, conta paga, telefone ou chave foi provisionado nesta entrega.

O modelo `deploy/wa-akg/compose.yaml` prepara gateway, MySQL privado, volumes e HTTPS Caddy. Foi preparado a partir do código oficial fixado no commit abaixo; não foi executado neste ambiente, que não tem Docker. Antes de usar, configure DNS, backup dos volumes e variáveis no host. Use senhas fortes aleatórias, sem caracteres reservados de URI na senha de banco, e mantenha o arquivo de ambiente fora do git.

Variáveis obrigatórias: `WA_DOMAIN`, `WA_AUTH_SECRET`, `WA_DB_PASSWORD`, `WA_DB_ROOT_PASSWORD`, `WA_ADMIN_EMAIL`, `WA_ADMIN_PASSWORD`. No host, execute `docker compose -f deploy/wa-akg/compose.yaml up -d --build` depois de configurar o ambiente. O primeiro build pode exigir capacidade maior que a operação cotidiana. O MySQL não publica porta externa.

1. Acessar a instância privada e criar a chave da API para a conta responsável pelas sessões TravelPro.
2. No TravelPro, administrador de plataforma cadastra endpoint e chave em Conexões → Administração TravelPro → Configurar WA-AKG. Nunca colocar a chave em HTML, URL ou conversa de suporte.
3. Responsável abre Conectar por QR Code: criar sessão → ativar recebimento → iniciar conexão → mostrar QR.
4. Escanear no celular, em Aparelhos conectados. Consultar conexão para confirmar o número.
5. Conferir que a IA está configurada para rascunhos do COS. Receber uma mensagem de teste autorizada, revisar lead, rascunho e atendimento humano. Envio externo de resposta/PDF requer revisão e ação explícita no portal.

WA-AKG usa Baileys/WhatsApp Web, sem homologação da API oficial da Meta. A continuidade da sessão e compatibilidade dependem desse projeto e de alterações no WhatsApp; reconexão por QR pode ser necessária.

Fontes oficiais consultadas: https://wa-akg.aikeigroup.net/docs e https://github.com/mrifqidaffaaditya/WA-AKG — código inspecionado no commit `936b26bf7c96bb5776e00224c3803c1bf39c7c71`. Os testes seguem os formatos reais de resposta do código, inclusive QR sem envelope `data`, webhook `message.received` e retorno `data.key.id` nos envios. Este projeto não incorpora o código da WA-AKG; conecta via API.

## Studio

Feed vertical 1080×1350, quadrado 1080×1080, carrossel 1080×1350, story/reels 1080×1920 e vídeo horizontal 1920×1080. Upload próprio otimizado localmente, cor, texto, chamada, legenda, público, objetivo e data planejada. Campanhas ficam no workspace; salvar uma edição atualiza o registro, duplicar cria outro.

Imagens são exportadas em PNG; carrossel por slide. Vídeos animados de 6 a 30 segundos usam foto, texto e roteiro de até oito cenas, sem áudio. MediaRecorder seleciona MP4 se disponível no navegador; caso contrário, WebM. A interface informa o formato e a eventual necessidade de conversão para publicação. A aba precisa ficar visível; exportação interrompida pode ser cancelada. Isso não é geração de filmagem por IA.

COS gera legenda usando o briefing quando o serviço de IA está conectado. Roteiro e legenda também podem ser baixados em TXT. A data é planejamento interno, sem agendamento externo. Não foi conectada publicação automática em redes sociais nem geração de mídia por serviço pago.

## Verificação

353 testes automatizados passaram: contratos da WA-AKG com respostas simuladas, webhook HTTP local e Supabase isolado, autenticação/escopo/assinatura/replay, proposta PDF via gateway, formatos e persistência do Studio. Nenhuma mensagem externa foi enviada. A gravação nativa MediaRecorder não foi exercitada em navegador real neste ambiente; há testes de capacidades, dimensões e interface, mas o download final de vídeo deve ser conferido no navegador do usuário. O download de Chromium estava indisponível na sessão.
