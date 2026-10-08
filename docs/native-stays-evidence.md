# Coleta própria de hospedagem: evidência e limites

Validação em 8 de outubro de 2026. O adaptador `native-laghetto` lê HTML público do motor oficial da rede, usando `native-http.mjs`. Não usa API de scraping, chave comercial, sessão autenticada ou execução de JavaScript do site. Esta implementação pesquisa tarifas e prepara sua revisão; não reserva, cobra nem garante disponibilidade.

## Resultado real observado

Consulta executada pelo próprio adaptador, com `createNativeCollector`, `AbortSignal.timeout(25000)` e a configuração normal de proxy de saída do ambiente (`NODE_USE_ENV_PROXY=1`):

| Campo | Valor |
| --- | --- |
| Destino / hotel | Rio Grande / Hotel Laghetto Rio Grande, ID público 7620 |
| Entrada / saída | 10/11/2026 / 15/11/2026, cinco noites |
| Ocupação | Dois adultos, um quarto, nenhuma criança |
| Coleta do documento | 2026-10-08T03:14:26.550Z |
| Resultado | Cinco tarifas de quartos, todas com total de estadia verificável em BRL |
| Requisições HTTP | Duas: `robots.txt` e página do hotel |
| Política de robôs | HTTP 200, conferida em 2026-10-08T03:14:19.340Z; caminho permitido |
| SHA-256 do HTML recebido | `dec760b7eb67241d5b5d59f4ec9375bf94b9e3e46501786886e10dad10cfa5cf` |

[Documento público consultado](https://reservas.laghetto.com.br/hotelresults?c=2143&q=7620&NRooms=1&CheckIn=10112026&CheckOut=15112026&ad=2&ch=&ag=&Code=&group_code=&lang=pt-BR&currencyId=16&version=4).

Quatro modalidades de quarto retornaram **R$ 1.434,93** pela estadia, incluindo os impostos listados pelo hotel. A modalidade com sacada retornou **R$ 1.578,44**. São valores históricos da coleta acima, não promessa de preço atual. A página também indicava café da manhã e cancelamento gratuito até 08/11/2026 para essas tarifas; as condições precisam ser reconferidas antes da reserva.

O primeiro total veio do atributo público `data-total-price-after-tax-public="1434.9296"`. Ele foi corroborado pelo subtotal exibido de R$ 1.379,74 e pelo imposto listado de R$ 55,19, vinculado aos mesmos IDs de quarto e tarifa. O atributo de imposto informava `55.1896`; subtotal + imposto coincide com o total antes do arredondamento monetário. O coletor não calculou o total multiplicando uma diária. Extras opcionais permanecem sujeitos à cobrança da fonte.

## Como os preços são classificados

O parser de quartos exige simultaneamente confirmação do hotel, datas, adultos, crianças, quantidade de quartos e moeda nos parâmetros públicos e nos campos do documento. Cada tarifa precisa repetir datas e ocupação, indicar inventário positivo, não exigir programa de fidelidade, apresentar subtotal público e imposto vinculado, e ter composição consistente com o total após impostos. O resultado é `price.basis: "stay"`, `completeness: "complete"`, `details.priceKind: "dated_quote"` e `bookable: false`. `availabilityConfirmed: false` expressa que nenhuma unidade ficou bloqueada ou reservada.

O parser da lista da rede lê `.property-offer .property-price-per-night .property-price`. Valores explicitamente marcados como iniciais e por noite ficam com `price.basis: "from"`, `completeness: "selection_required"` e `details.priceKind: "published"`. Nunca viram totais por multiplicação. Na consulta de Gramado para o mesmo período, foram observados seis preços iniciais legíveis; o menor era R$ 669,20 por noite, com impostos não inclusos. Essa lista pode abrir a consulta detalhada dos quartos.

O seletor de quartos é `.roomrate .rate_plan.roomrateinfo[data-total-price-after-tax-public]`; a versão é `laghetto-room-html-v1`. A lista usa `laghetto-chain-html-v1`. Cada oferta registra URL, horário, hash do documento, versão do parser, seletor, preço bruto e moeda. O HTML completo não é enviado ao cliente nem salvo como artefato de produto. As fixtures dos testes são fragmentos mínimos construídos a partir da estrutura observada.

## Cobertura e limites de consulta

- Catálogo público verificado: 25 IDs de hotéis em Gramado, Canela, Bento Gonçalves, Porto Alegre, Rio Grande, Rio de Janeiro e São Paulo. Não representa cobertura mundial.
- Ocupação homologada pelo parser: um quarto, somente adultos, BRL. Crianças e vários quartos retornam uma limitação explícita antes de acessar a rede. Um quarto com dois adultos foi o caso de homologação ao vivo.
- Por padrão, a busca lê uma lista da rede e consulta os quartos de até dois hotéis com menor preço inicial legível. São no máximo três páginas de conteúdo por consulta à fonte, além das verificações de robôs e redirecionamentos limitados pelo transporte.
- `request.hotelId` permite consultar diretamente uma página de quartos. O ID precisa constar no catálogo verificado e pertencer ao destino; IDs arbitrários são rejeitados.
- `requestsUsed: 1` conta uma consulta lógica à fonte. `networkRequests` contabiliza HTTP realizado pelo transporte, incluindo robôs. Não são a mesma medida.
- A busca geral transmite seu sinal de cancelamento de 25 segundos a todas as leituras. Falhas na leitura de quartos preservam os preços iniciais já lidos e exibem uma advertência. Limite de bytes, hosts e robôs são aplicados por `native-http.mjs`.
- As ofertas expiram para revisão após cinco minutos da coleta. Novo preço exige nova consulta. Scripts de terceiros não executam no JSDOM, e nenhum recurso externo é carregado pelo parser.

Os IDs e caminhos de consulta foram obtidos do formulário e do catálogo públicos do motor. Os botões da lista são JavaScript sem `href`; a URL de quartos usa o caminho público `/hotelresults` observado no motor, o ID do hotel da lista e os parâmetros explícitos do pedido. Nenhuma rota interna autenticada é utilizada.

## Fontes avaliadas e interrompidas

| Fonte | Observação | Decisão |
| --- | --- | --- |
| [Hoteis.com](https://www.hoteis.com/robots.txt) | A página de busca possui HTML com preços, mas a política para o coletor genérico bloqueia `/Hotel-Search` e URLs com datas. | Fonte direta desativada no catálogo. Não usar identidade de outro robô nem contornar a regra. |
| Booking.com | A tentativa normal de página pública retornou HTTP 202 com desafio de robô. | Coleta interrompida, sem resolver ou contornar o desafio. |
| Site institucional Laghetto | O HTML de marketing continha valores sem comprovação de tarifa da pesquisa. | Esses valores foram rejeitados; apenas o motor oficial de reservas é usado. |
| [Motor Laghetto](https://reservas.laghetto.com.br/robots.txt) | HTML público acessível; política permite os caminhos usados da rede 2143. | Adaptador ativo com verificação de robôs em tempo de consulta. |

## Verificação reproduzível

```sh
node --test tests/native-stays.test.mjs
```

Os testes cobrem datas e ocupação divergentes, moeda, cidades, imposto e subtotal inconsistentes, tarifas de fidelidade, inventário inválido, script inerte, ausência de campos, destinos sem suporte, limite de duas páginas de quartos e preservação de respostas parciais. A homologação real acima foi feita separadamente; a suíte não depende de preço, disponibilidade ou acesso externo.
