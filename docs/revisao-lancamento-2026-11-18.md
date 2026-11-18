# TravelPro — revisão de lançamento, 18/11/2026

## Decisão
Não liberar lançamento público neste estado. A landing está acessível, mas GET /api/health retorna HTTP 500 com erro de consulta/gravação. A disponibilidade do site estático não comprova o funcionamento da agência. Após restaurar o banco e validar os fluxos reais, começar por piloto acompanhado.

## Evidências e limites
- Produção: https://www.usetravelpro.com. API de saúde HTTP 500, confirmado repetidamente nesta revisão.
- Vercel: 60 erros em /api/cron/granatum na janela de uma hora consultada. Mensagem “TravelPro database: undefined”; causa raiz ainda não identificada.
- O projeto Supabase do TravelPro não foi identificado entre os três projetos acessíveis pela conexão atual. Não foram alterados projetos de outros produtos.
- TRAVELPRO_SERVER_IDLE_ENFORCEMENT e TRAVELPRO_PLATFORM_ADMIN_IDS não estão entre as variáveis da Vercel. A proteção de inatividade no servidor e a administração de integrações precisam de configuração e validação. Não ativar a primeira sem verificar a migração correspondente.
- 373 testes automatizados passaram, sem falhas. Sintaxe validada em 60 arquivos; inicialização serverless passou; diff sem erros de espaços.
- O navegador confirmou a landing e o redirecionamento do portal sem sessão para login. Os fluxos privados foram testados com fixtures isoladas, não com uma conta real em produção.
- Cadastro, confirmação de e-mail, recuperação de senha, persistência real, isolamento entre agências, políticas RLS e restauração de backup ainda precisam de homologação na infraestrutura correta. Não se pode declarar a segurança de produção integralmente auditada sem esse acesso.

## Busca real atual
Foram consultadas fontes públicas em 18/11/2026, sem APIs pagas e sem reservas.

| Cenário | Ofertas publicadas | Resultado |
|---|---:|---|
| Hotel em Rio Grande | 0 | Laghetto bloqueou automação |
| Oportunidades aéreas | 27 | GOL e Azul responderam |
| Passeios e transfers | 42 | Civitatis e Siga responderam; GetYourGuide falhou |
| Ingressos em Paris | 8 | Tiqets respondeu, com preços em GBP |
| Pacotes de carro | 0 | Movida falhou |

Total: 77 ofertas publicadas, nenhuma classificada como cotação completa. São preços indicativos, sujeitos a disponibilidade, moeda, taxas e revalidação. O teste local não comprova conectividade dos fornecedores a partir da Vercel. Seguro e cobertura global de hotéis/carros não foram homologados. Não anunciar emissão, reserva automática ou comparação universal.

## Organização implementada
- Navegação principal: Hoje, Atendimentos, Cotações, Propostas, Clientes, Financeiro e Mais.
- Mais agrupa viagens, agenda, roteiros, documentos, criação e configurações. Rotas e dados antigos preservados.
- WhatsApp aparece no menu quando configurado ou quando há conversas existentes; ativação continua acessível em Conexões.
- Primeiro acesso orienta a criar atendimento e preparar proposta; não apresenta uma tela vazia sem direção.
- Câmbio e horários foram recolhidos no diálogo, reduzindo a informação permanente no cabeçalho.
- Plano, faturamento, TravelMatch e Vuei saíram dos menus principais. Integrações futuras ficaram recolhidas; QR indisponível não parece acionável.
- Landing esclarece os limites de cotação, emissão e WhatsApp.
- Login e cadastro exibem indisponibilidade quando a API falha. O formulário de cadastro não envia novos dados nessa condição. Isso é uma proteção de experiência, não um bloqueio de segurança da API.
- Logout continua disponível quando a agência falha ao carregar.

## Escopo recomendado para a primeira versão
Manter atendimento → cotação → proposta/PDF → organização da viagem e financeiro. Studio pode ficar secundário como criação assistida; não prometer publicação automática ou geração completa de vídeos. WhatsApp por QR só entra na oferta após sessão real homologada, reconexão e isolamento por agência. Cobrança de assinatura, pagamento, assinatura eletrônica e emissão não devem aparecer como recursos prontos enquanto dependem de integração futura.

## Condições para liberar
1. Identificar/conectar o Supabase correto; verificar status, credenciais, logs e migrações, corrigindo a causa do HTTP 500. Saúde deve voltar a 200 e a sincronização Granatum deve parar de falhar.
2. Homologar criação de agência, confirmação de e-mail, login, recuperação, logout, expiração e tentativa de acesso entre duas agências. Verificar RLS, armazenamento privado e backup/restore.
3. Com dados de homologação, completar atendimento → cliente → cotação → proposta/PDF → confirmação → financeiro; recarregar e entrar novamente para comprovar persistência. Validar no celular.
4. Configurar administradores e proteção de sessão no servidor após conferir o schema. Validar integrações anunciadas, sem deixar recursos não configurados parecendo ativos.
5. Definir canal de suporte, termos, privacidade e modelo comercial antes de cadastro público/pago. Os links e condições ainda não estão prontos; dados jurídicos e preços não foram inventados nesta revisão.
6. Só então iniciar piloto acompanhado e medir erros, conclusão de propostas e dificuldades de uso antes de ampliar divulgação.

## Dependência externa
É necessário identificar o projeto Supabase usado pelo TravelPro e disponibilizá-lo na conexão. Não enviar senha, service-role ou outras chaves no chat. As melhorias de interface não resolvem, por si só, a indisponibilidade do banco.
