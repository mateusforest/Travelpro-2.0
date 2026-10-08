# Coleta própria: transporte — evidências e limites

Verificação realizada em 8 de outubro de 2026, entre 02:58 e 03:01 UTC. Os valores abaixo são registros históricos da coleta, não preços garantidos para venda.

## Resultado concreto

Foi implementado `backend/native-transport.mjs`, com leitura de HTML público e extração própria, sem GeckoAPI, SearchApi, SerpApi ou outro serviço de scraping:

- `native-gol`: ofertas publicadas da GOL, com origem, destino, data, preço e tipo de viagem.
- `native-azul`: ofertas publicadas da Azul, excluindo tarifas em pontos.
- `native-movida-prepaid`: três produtos de aluguel pré-pago, disponíveis apenas no modo oportunidades.

A coleta utiliza `createNativeCollector().getHtml` de `backend/native-http.mjs`. Cada domínio é permitido explicitamente; a leitura respeita robots, limite de tamanho, tempo, redirecionamento e ausência de desafio de acesso. Não acessa endpoints privados de tarifas, não faz login, não reserva, não emite e não compra.

## Evidência obtida por HTTP público

Os documentos foram obtidos com solicitações GET comuns através da saída de rede fornecida pelo ambiente, usando a biblioteca padrão `urllib.request` e identificador próprio. Não foi utilizado serviço de scraping, chave de fornecedor, rotação de IP ou resolução de CAPTCHA. O ambiente possui proxy de saída padrão; ele foi utilizado automaticamente pela biblioteca, sem configuração adicional.

| Fonte e página | HTTP / bytes | Extração própria sobre o HTML recebido |
|---|---:|---|
| [GOL: Porto Alegre–São Paulo](https://www.voegol.com.br/br/voos-de-porto-alegre-para-sao-paulo) | 200 / 861.583 | 35 ofertas publicadas em reais |
| [Azul: Porto Alegre–São Paulo](https://passagens.voeazul.com.br/pt/voos-de-porto-alegre-para-s%C3%A3o-paulo) | 200 / 1.591.390 | 22 registros; 11 em pontos excluídos; 7 ofertas em reais após deduplicação |
| [Movida Pré-Pago](https://www.movida.com.br/prepago) | 200 / 344.523 | 3 pacotes de cinco diárias |

SHA-256 dos corpos recebidos:

```text
GOL   4b7bdd6b4d191ef3fba60a46bfb5a0075e5b13582513b5bc9cf0eecb948a9e66
Azul  42f89f6a7a9deba7443319aa27d0c9be7ecf25b9d10bf6472b848809daccc6d9
Movida 7c1f3b42c4371b04552e66d30a1e57e53329deff0d31ff34cf68ae0e52dc27cc
```

Exemplos observados:

- GOL, POA–CGH, ida em 31/12/2026: a partir de R$ 499,59. O módulo público indicava um passageiro e preço visto um dia antes.
- Azul, POA–GRU, ida em 06/12/2026: a partir de R$ 383,95. O registro indicava preço visto 13 minutos antes; quantidade de passageiros não informada.
- Azul, POA–CGH, ida em 17/12/2026: a partir de R$ 521,59.
- Movida, Econômico: pacote de cinco diárias por R$ 1.099,50, equivalente anunciado a R$ 219,90 por diária. Não é uma consulta de disponibilidade por loja ou período.
- Movida, Econômico Plus: pacote de cinco diárias por R$ 1.349,50.
- Movida, Automáticos: pacote de cinco diárias por R$ 1.449,50.

O site da Movida publicava prazo de uso de seis meses, antecedência de 60 minutos para resgate, limite de 25 diárias acumuladas, diária de 27 horas, proteção básica e taxa de locação. Esses campos são extraídos do texto atual; não são presumidos quando ausentes.

## Formato real das companhias

GOL e Azul entregaram HTML com um elemento público `script#__NEXT_DATA__`. O JSON contém `props.pageProps.apolloState.data` e objetos `StandardFareModule:*`, com uma lista `fares`. Somente essa estrutura de exibição é lida. O código não executa scripts da página.

Campos usados: `originAirportCode`, `destinationAirportCode`, `departureDate`, `returnDate`, `flightType`, `totalPrice`, `currencyCode`, `redemption`, `priceLastSeen` e metadados públicos do módulo. A lista pode conter dados de outros destinos; o conector filtra a rota solicitada.

Encontramos um detalhe relevante: algumas tarifas em pontos da Azul também trazem `currencyCode: BRL` e um `totalPrice` numérico. O campo `redemption` identifica que não são reais. O coletor as descarta e há teste específico contra essa conversão incorreta.

As datas e o preço de vitrine são preservados em `details.publishedStart`, `publishedEnd`, `advertisedBasis`, `priceLastSeen` e `priceScope`. Nunca se multiplica o valor por adultos/crianças para produzir um total sem confirmação.

## Cotação e oportunidades

- Modo de datas exatas: retorna somente os anúncios públicos que coincidem com rota, ida e volta solicitadas. Mesmo coincidindo, continua sendo tarifa publicada, sem confirmação de disponibilidade.
- Modo oportunidades: aceita outras datas publicadas para a mesma rota e apresenta as datas reais do anúncio; `requestedDatesMatched` identifica se coincidem com o pedido.
- Movida Pré-Pago: exclusivo do modo oportunidades. Sempre preserva o total do pacote de cinco diárias, sem recalcular como locação para a duração solicitada.
- Todos os resultados permanecem `bookable: false`, `completeness: unknown`, `price.basis: from` e `details.priceKind: published`.
- O horário de recebimento não é apresentado como horário original da apuração da tarifa. `sourceTimestampAvailable` é falso; a indicação relativa da companhia é mantida separadamente.

## Cobertura e navegação atuais

O conector utiliza as páginas oficiais de origem Porto Alegre, as páginas específicas Porto Alegre–São Paulo e as páginas gerais de ofertas. Não inventa URLs de estoque nem supõe que todas as rotas estejam presentes no HTML. A página genérica pode não publicar a rota pesquisada. A ampliação futura pode cadastrar outras páginas públicas verificadas e, onde houver autorização e viabilidade, fluxos de navegação documentados.

Também foram lidas as páginas oficiais da LATAM, Localiza, Movida e Unidas:

- LATAM, página Porto Alegre–São Paulo: HTML acessível e `AggregateOffer.lowPrice`, mas sem data correspondente no conteúdo obtido. Não foi criado conector que transforme esse valor em cotação.
- Localiza e Unidas: páginas acessíveis, sem tarifa de locação por datas identificada no HTML recebido. Não foram criados conectores vazios para simular cobertura.
- Movida: a página Pré-Pago oferece produto com preço público verificável; o fluxo de reservas possui restrição em robots e não foi consultado.

## Regras públicas e limitação de execução

`https://www.voegol.com.br/robots.txt` restringia caminhos de controle e autenticação, sem vedação aos caminhos de ofertas usados. `https://www.movida.com.br/robots.txt` restringia `/reserva`, `/usuario`, `/pessoa` e outros caminhos, mas não `/prepago`. O arquivo da Azul foi obtido e deve ser interpretado pelo coletor comum; qualquer erro de interpretação interrompe a coleta.

A primeira tentativa com DNS direto não funcionou nesta infraestrutura. O coletor foi então integrado à saída padrão já configurada pelo ambiente (Node.js com proxy de ambiente), sem alterar configuração ou contornar bloqueios. Na verificação integrada a partir de 03:14 UTC, o próprio coletor e o motor retornaram 27 ofertas POA–CGH de GOL/Azul e três pacotes Movida. Veja [a evidência integrada](native-live-verification.json). Fora de ambientes com proxy explicitamente configurado, o transporte continua usando DNS validado e endereço público fixado.

## Verificação automatizada

`node --test tests/native-transport.test.mjs`: sete testes abrangendo leitura do formato público, exclusão de pontos, descarte de preços inválidos, deduplicação, separação de datas exatas/oportunidades, falhas sem repetição oculta, restrições de pacotes e preservação do preço publicado para um grupo diferente de viajantes.
