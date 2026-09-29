# Portal TravelPro — operação por atendimento

A entrada passa a ser o trabalho do dia. Um pedido abre um atendimento, que acompanha a negociação e depois a viagem, sem exigir outro cadastro.

## Navegação

- **Hoje:** compromissos para conferir, validade registrada de propostas e próximos embarques de viagens com etapa Confirmada. Compromissos antigos pedem conferência; o sistema não presume que ficaram sem atendimento.
- **Atendimentos:** busca por cliente/destino e filtros Todos, Em negociação e Confirmados. Cada linha apresenta o próximo compromisso registrado ou um registro anterior para conferir.
- **Clientes:** cadastro, preferências, documentos pessoais e histórico de viagens.
- **Financeiro:** acesso ao módulo existente de compromissos, recebimentos, comissões, contas e fluxo de caixa.
- **Mais:** agenda, propostas, roteiros, documentos, WhatsApp, cotação e configurações. Ferramentas secundárias ficam fora da navegação principal.

## Fluxo principal

1. **Novo atendimento:** escolher cliente existente ou informar nome; telefone, destino e pedido são opcionais. O cliente e o atendimento são salvos juntos. Datas e quantidade de viajantes desconhecidas ficam a confirmar.
2. **Visão geral:** pedido, contato e próximos passos. Um compromisso pode ser concluído sem apagar seu histórico.
3. **Propostas e materiais:** propostas, roteiros e documentos explicitamente vinculados ao atendimento. Uma proposta criada aqui reaproveita cliente, destino e datas conhecidas; a validade deve vir da cotação original.
4. **Reservas e viajantes:** acesso aos registros operacionais já existentes.

Os vínculos antigos não são deduzidos pelo nome do cliente: duas viagens da mesma pessoa podem ter propostas diferentes. Materiais antigos sem vínculo continuam nos módulos próprios. Editores de materiais vinculados oferecem retorno ao atendimento.

## Assistente COS

O botão discreto abre um painel lateral sobre a tela atual. O rascunho da conversa sobrevive ao fechamento do painel. Conversar e anexar arquivos não substitui o formulário em edição. O contexto do atendimento acompanha a conversa quando se está nele ou em um material vinculado.

O modo disponível aparece no painel. Com IA configurada, usa a conexão existente; sem ela, oferece ações guiadas. Arquivos são guardados na agência, mas o COS ainda não analisa o conteúdo dos anexos. As ações propostas abrem os respectivos formulários para revisão.

## Limites desta entrega

Esta mudança reorganiza o portal existente. Não implementa ingestão automática de e-mails, integração específica com a Europlus, análise de PDFs, Open Finance, assinatura eletrônica ou emissão fiscal. Também não confirma reservas, pagamentos ou comissões a partir da aprovação de uma proposta. Esses fluxos continuam dependendo das integrações e confirmações próprias.

## Prévia local isolada

Execute `node scripts/preview-operations.mjs` a partir da raiz e abra `http://127.0.0.1:4187/portal.html`. O script cria uma base temporária nova a cada execução, usa somente registros fictícios e não carrega o arquivo `.env` nem credenciais de provedores. Escuta apenas em `127.0.0.1`.

- E-mail fictício: `preview@travelpro.test`
- Senha da prévia: `TravelPro-preview-2026`

Nenhum dado da agência de produção é usado ou alterado por esse script. As credenciais acima servem somente para a conta local criada por ele.

## Verificação

Os testes de operação cobrem datas e validades, dados vazios, busca, vínculos e não alteração do estado durante renderização. Os testes do portal cobrem persistência, cliente existente, propostas vinculadas, conclusão de compromisso, URLs antigas, chat concorrente e preservação de edição durante anexos.
