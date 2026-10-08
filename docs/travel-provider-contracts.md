# Contratos de consulta de viagens

Verificação documental: 8 de outubro de 2026. Os adaptadores usam as APIs comerciais dos provedores, sem emitir reservas. Os testes usam fixtures identificadas como testes; não constituem consultas reais ou certificação comercial.

## GeckoAPI

`POST https://api.geckoapi.com.br/v1/extract`, autenticação `Authorization: Bearer`, JSON com `target` e `type: "plp"`. Até uma requisição por invocação; não há tentativas automáticas. `data.extractedAt` preserva o horário de coleta. `200` com `data: null, notFound: true` significa consulta concluída sem resultado. Falhas HTTP, JSON inválido e `success: false` não são resultados vazios de inventário.

| Adaptador | Entrada específica | Preço e estrutura documentados |
|---|---|---|
| [Booking](https://geckoapi.com.br/docs/booking-com-br-plp/) | `target: booking.com.br`, `keyword`, `checkinDate`, `checkoutDate`, `numAdults`, `numChildren`, `numRooms`, `currency`, `lang`, `page` | `data.items[].price`, `currency`, `averagePricePerNight`; a referência não define suficientemente o escopo de `price`, então a base permanece desconhecida. |
| [Hoteis.com](https://geckoapi.com.br/docs/hoteis-com-plp/) | `target: hoteis.com`, `location`, datas, ocupação e `page` | `data.items[].leadPrice.amount/currency`; `taxesAndFees` é texto. Preço principal não é automaticamente total da estadia. |
| [LATAM](https://geckoapi.com.br/docs/latamairlines-com-plp/) | `target: latamairlines.com`, `from`, `to`, `departureDate`, `returnDate`, contagens de passageiros | `data.items[].price.total/amount/currency`, `route`, `flight`, `fare`. |
| [GOL](https://geckoapi.com.br/docs/voegol-com-br-plp/) | `target: voegol.com.br`, aeroportos, datas e contagens | `data.itineraries[].offers[].total.amount/currency`, segmentos e marca tarifária. |
| [Azul](https://geckoapi.com.br/docs/voeazul-com-br-plp/) | `target: voeazul.com.br`, aeroportos, datas, contagens, `currency`, `points: false` | `data.trips[].journeys[].fares[].total.amount/currency`. Viagens e trechos separados não provam tarifa completa de ida e volta. |

As consultas de hotéis documentam contagem de crianças, mas não suas idades. Ocupações com crianças são ignoradas explicitamente nesses adaptadores, com aviso e zero consumo. O escopo de preço por passageiro e por trecho dos voos deve ser validado com amostras reais antes de importar automaticamente um total para proposta.

## SearchApi

`GET https://www.searchapi.io/api/v1/search`, autenticação por cabeçalho Bearer, com `engine: google_hotels` ou `google_flights`.

[Hotéis](https://www.searchapi.io/docs/google-hotels-api): `q`, `check_in_date`, `check_out_date`, `adults`, `children_ages` de 1 a 17, `currency`, `hl`, `gl`, `property_type: hotel`. Até seis hóspedes. Não foi encontrado parâmetro para vários quartos. Resposta: `properties[].total_price.extracted_price` é o total, `price_per_night.extracted_price` é a diária. Nunca multiplicar a diária arredondada para inventar um total. Próxima página: `pagination.next_page_token`. O primeiro resultado pode informar o site do hotel, não necessariamente o vendedor da menor tarifa.

[Voos](https://www.searchapi.io/docs/google-flights-api): `departure_id`, `arrival_id`, `outbound_date`, `return_date`, `flight_type: round_trip|one_way`, `adults`, `children`, categorias de bebês e moeda. Respostas `best_flights` e `other_flights`. Uma consulta de ida e volta retorna escolhas de ida: `departure_token` consulta as voltas e `booking_token` consulta opções de compra. Esses passos não estão implementados nesta etapa e consomem consultas adicionais. O adaptador marca seleção pendente.

## SerpApi

`GET https://serpapi.com/search.json`, autenticação `api_key` em parâmetro, nunca exposta em logs ou no cliente. `no_cache=true` solicita nova coleta. A documentação informa cache de uma hora e consultas em cache gratuitas quando permitidas. Nova coleta no Google não equivale a estoque garantido no vendedor.

[Hotéis](https://serpapi.com/google-hotels-api): datas e ocupação semelhantes, porém `children` e `children_ages` devem corresponder. Menores de um ano são representados como idade 1, conforme documentação, e o usuário recebe esse aviso. `total_rate.extracted_lowest` é total da estadia; `rate_per_night.extracted_lowest` é diária. Próxima página em `serpapi_pagination.next_page_token`. Não há parâmetro de distribuição entre quartos documentado.

[Voos](https://serpapi.com/google-flights-api): usa `type=1` para ida e volta, `type=2` para só ida, `deep_search=true`, aeroportos e datas. O fluxo de tokens é semelhante ao SearchApi. Preço inicial de ida e volta permanece “a partir de”; nunca somar esse valor a um preço de volta. Totais para grupos e condições permanecem não verificados. Contagens de crianças exigem mapear categorias tarifárias e definir assento de bebês; a versão atual bloqueia explicitamente essa composição.

## Limites de interpretação

- Valores permanecem na moeda retornada, em unidades monetárias, sem conversão silenciosa.
- Impostos, bagagem, quarto e cancelamento ausentes são desconhecidos, nunca inferidos pela IA.
- Amenidade “café da manhã” do hotel não prova alimentação incluída na tarifa.
- A primeira página não representa todo o inventário; a interface recebe um aviso quando há continuação.
- `capturedAt` preserva data de origem quando presente; se ausente, registra recebimento com aviso. O adaptador não inventa validade tarifária. O motor preenche `expiresAt` como prazo técnico de atualização de até cinco minutos, exibido como tal; isso não garante o preço.
- Nenhuma busca comprova disponibilidade no pagamento. Todas as ofertas têm `bookable: false`.
- Sem credencial a fonte fica não configurada; não há substituição por respostas de demonstração.
- Respostas externas limitadas a 2 MiB, até 100 ofertas, tempo limitado, URLs HTTPS públicas e erros sem corpo bruto ou chave.

## Opções preservadas para expansão

Coleta/navegação: Firecrawl, Apify, Bright Data, DataForSEO, Oxylabs, Crawl4AI, Browser Use, Stagehand e Crawlee. Não são conectores de viagem operacionais nesta entrega.

Inventário e transação a contratar/validar: Cangooroo/Juniper, Travelgate, RateHawk, TBO, Hotelbeds/HBX, Wooba, Duffel, Viator, Civitatis, Mobility, Assist Card e Affinity. Cada contratação define acesso, tarifas, emissão, liquidação e suporte. A presença nesta lista não significa integração concluída.

Próxima validação: consultas autenticadas com datas futuras; comparar total e ocupação na mesma oferta do vendedor; esclarecer escopo tarifário dos voos e preços Gecko; depois habilitar propostas automáticas e seleção de voltas com orçamento explícito de consultas.
