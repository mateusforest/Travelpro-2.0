# Cotação independente — primeira etapa

Data: 8 de outubro de 2026 (UTC).

## Entrega desta versão

Em **Cotações → Gerar cotação** e em **Atendimento → Registrar cotação recebida**, a agência pode manter o preço final informado ou calcular a venda a partir de custo líquido, acréscimo sobre custo ou margem sobre venda, taxa de serviço adicional e custos de pagamento. O resultado é uma estimativa antes dos tributos e despesas da agência, não uma comissão já recebida.

O custo é do grupo inteiro, em BRL, já com taxas do fornecedor e conversão cambial conferidas. Comissões descontadas do custo não devem ser adicionadas novamente. Comissões futuras pagas pelo fornecedor ainda não são conciliadas por este módulo.

Os dados ficam em `quote.privatePricing`, dentro do workspace autenticado da agência. `normalizeQuote` e `buildBudget` copiam apenas os campos comerciais destinados à proposta; o HTML de cotação exportado não inclui o resumo interno. O servidor recalcula os valores ao validar o workspace. Cotações vinculadas a atendimentos continuam imutáveis; revisões exigem uma nova cotação. A estimativa interna se refere à cotação de origem: descontos/edições posteriores na proposta não atualizam essa estimativa.

Exemplos, sem taxas: custo R$ 10.000 e acréscimo 10% → venda R$ 11.000; margem 10% sobre venda → venda R$ 11.111,12, com arredondamento para cima. Taxas percentuais do pagamento são calculadas sobre o preço final. No modo margem, o preço cobre a margem escolhida, a taxa de serviço adicional e os custos informados. Todos os cálculos usam centavos e pontos-base inteiros.

Nenhuma busca de inventário, reserva, emissão, cobrança ou comunicação real é executada por esta versão. O acompanhamento de reserva existente continua sendo um registro manual do que o fornecedor confirmou. O conector genérico de cotação anterior foi preservado; a interface deste fluxo usa a expressão fornecedor.

## Próxima integração: escolha informada por documentação oficial

| Opção | Papel | Condição a validar |
| --- | --- | --- |
| Nuitée / LiteAPI | Hotéis: busca, revalidação, reserva e cancelamento | Credenciais, ativação comercial, pagamento ao fornecedor, cobertura e preços para os destinos da agência |
| Duffel | Aéreo: busca, reserva e emissão usando conteúdo gerenciado | Elegibilidade da empresa brasileira, companhias/rotas disponíveis, ponto de venda, moeda, custos e atendimento pós-venda |
| Hotelbeds / HBX | Hotéis e expansão para outros serviços | Acordo comercial e certificação para produção |
| Booking.com Demand | Inventário via parceria | Managed Affiliate Partner, contrato e permissões para os endpoints necessários |

Primeiro teste recomendado: hotéis com LiteAPI, preservando interfaces de provedores independentes para evitar dependência de um só fornecedor. Duffel é candidato para aéreo após validar a cobertura brasileira. SDKs abertos, como o cliente JavaScript oficial da Duffel, ajudam a integrar; não fornecem inventário gratuito ou acesso comercial por si mesmos. Não há promessa de cobrir toda a internet ou sempre superar preços de varejo.

## Fluxo de produção a implementar após obter acesso

1. Pesquisa autenticada pelo servidor; normalização de moeda, ocupação, bagagem/quarto, alimentação, regras, taxas e validade.
2. Oferta original imutável, com ID do fornecedor, instante da consulta e custo privado.
3. Preço e proposta da agência; controle explícito de quem cobra o cliente e quem paga o fornecedor.
4. Revalidar disponibilidade e custo imediatamente antes da operação. Mudanças de preço exigem nova aceitação.
5. Reserva com referência única e prevenção de duplicação. Timeout leva a consulta de status, nunca a uma segunda reserva automática.
6. Pagamento e reserva têm estados próprios. Link, boleto ou Stripe podem cobrar o cliente, mas não confirmam o serviço nem pagam automaticamente o fornecedor. Se houver falha após cobrança, conciliar e tratar estorno.
7. Registrar localizador, confirmação/voucher ou bilhete; acompanhar cancelamento, alteração e reembolso.

A arquitetura deve aceitar reservas via API e execução assistida no canal do fornecedor quando não houver API autorizada. Preços vistos em sites são referências até revalidação. Não usar coleta de páginas como garantia de reserva ou emissão.

## Fontes verificadas

- https://docs.liteapi.travel/docs/hotel-integration-guide
- https://docs.liteapi.travel/docs/revenue-management-and-commission
- https://duffel.com/flights/content/managed
- https://github.com/duffelhq/duffel-api-javascript
- https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/
- https://developers.booking.com/demand/docs/getting-started/prerequisites

## Verificação

`tests/private-pricing.test.mjs` cobre cálculo, arredondamento, limites, rejeição de valores manipulados no servidor, criação de proposta sem custos internos e fluxo de salvar/reabrir/editar/exportar no DOM. Está incluído em `npm test`.
