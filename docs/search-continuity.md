# Busca e organizador: continuidade da pesquisa

Esta evolução mantém a coleta própria e acrescenta continuidade ao trabalho da agência. Não altera o escopo de fornecedores, não cria reservas e não transforma referências publicadas em disponibilidade confirmada.

## Destinos e aeroportos

O formulário tem sugestões locais para 92 aeroportos e 87 cidades, com nomes e códigos conferidos no [dataset público OurAirports](https://ourairports.com/data/) em 08/10/2026. O arquivo `dist/travel-locations.js` registra a origem e o hash do dataset. Nomes de cidades foram adaptados para português.

Uma cidade com um único aeroporto no catálogo pode ser resolvida diretamente. São Paulo, Paris, Londres e outras cidades com vários aeroportos exigem escolha explícita. Códigos IATA digitados em maiúsculas continuam disponíveis fora do catálogo. As sugestões facilitam o preenchimento; não indicam cobertura nem existência de voos.

As fontes nativas informam cobertura, modos e ocupação atendida. Uma combinação não suportada recebe motivo específico, sem fazer requisição ao fornecedor. As APIs opcionais continuam dependentes das credenciais do servidor.

## Viagens salvas

O organizador permite nomear e guardar até 30 planos por agência, cada um com até 12 opções. Os planos podem ser retomados, alterados e excluídos explicitamente. A exportação local da seleção continua disponível.

Cada opção salva é uma referência histórica: preserva origem, valor, moeda, datas e condições, mas perde a elegibilidade para importação e para soma como tarifa recente. Reabrir um plano não reconfirma preço ou disponibilidade. Não há armazenamento de credenciais, comissão ou cálculo privado dentro do plano.

As rotas são `GET/POST /api/travel-plans` e `GET/PUT/DELETE /api/travel-plans/:id`, com autenticação existente em SQLite e Supabase. Gravações exigem a versão do workspace; editar ou excluir exige também a revisão do plano. A coleção vive no estado JSON existente, portanto não precisa de migração. O salvamento genérico do workspace preserva a coleção administrada pelas rotas de planos.

No portal, a gravação entra na mesma fila do salvamento da agência. Edições realizadas enquanto a requisição está em andamento continuam pendentes, sem serem consideradas salvas por engano. Conflitos entre acessos são apresentados para revisão.

## Atualização de tarifas

Uma reconsulta envia `refresh: true`, respeita os mesmos limites de tempo e consultas e ignora o cache de ofertas. O cache de regras de acesso dos sites continua ativo. A consulta não altera o preço selecionado automaticamente.

Cada oferta elegível tem uma identidade baseada no fornecedor, produto ou quarto/tarifa, datas, ocupação, moeda, base de cobrança, impostos e condições. O valor e o horário podem mudar sem mudar a identidade. Sem uma identificação confiável, ou quando há mais de uma correspondência, a ferramenta não substitui a seleção pelo resultado de nome parecido.

A interface mostra o resultado da reconsulta e requer aceitação explícita para atualizar o organizador. Se não houver a mesma oferta, a referência anterior é preservada. Preços iniciais de hotel continuam exigindo seleção de quarto; uma diária publicada não pode ser trocada silenciosamente pelo total da hospedagem.

## Validação e operação

Na verificação real de 08/10/2026, às 15:49 em Brasília, a consulta direta ao Laghetto Rio Grande retornou cinco tarifas. Uma repetição reutilizou o cache sem acessar a fonte; a atualização explícita voltou ao fornecedor, encontrou as cinco mesmas identidades e não usou cache. Exemplo observado: R$ 1.359,40, dois adultos, um quarto, de 10 a 15/11/2026, com os impostos informados pela fonte. Trata-se de registro histórico, sujeito a nova consulta. A evidência está em [search-continuity-verification.json](search-continuity-verification.json).

Os testes cobrem agência e autenticação, conflitos de versão, retomada de planos, isolamento entre agências na interface, atualização de preços, ambiguidades e cobertura. O build continua importando o entrypoint com a restrição de módulos usada pela Vercel antes de permitir a publicação.

Reserva, emissão, cobrança, seguros e monitoramento contínuo de promoções permanecem fora desta etapa. As limitações de ocupação e destinos dos coletores estão em [native-search.md](native-search.md).
