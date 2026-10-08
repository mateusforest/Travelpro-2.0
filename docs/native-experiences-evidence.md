# Coleta própria de experiências: evidência de execução

Em 08/10/2026, entre 02:59:23 e 02:59:28 UTC, requisições HTTP comuns acessaram diretamente os sites abaixo. Agente identificado: `TravelProResearchBot/0.1`. Os arquivos `robots.txt` foram consultados antes das páginas. Não foram utilizadas GeckoAPI, SearchApi, SerpApi ou outras APIs de extração; não houve login, CAPTCHA, proxy de contorno nem consulta a endpoints internos proibidos.

## Resultados observados

| Origem pública | HTTP / tamanho | Resultado do parser próprio |
|---|---|---|
| [Civitatis Porto Alegre](https://www.civitatis.com/br/porto-alegre/) | 200 / 263.476 bytes | 6 referências: três atividades e três transfers; seguro e eSIM excluídos. |
| [Tiqets Louvre](https://www.tiqets.com/pt/bilhetes-museu-do-louvre-l124297/) | 200 / 526.017 bytes | 7 produtos de ingressos/experiências; mínimo agregado do local excluído. |
| [GetYourGuide Porto Alegre](https://www.getyourguide.com/pt-br/porto-alegre-l32362/tours-guiados-tc1144/) | 200 / 1.243.454 bytes | 13 atividades de catálogo extraídas do JSON-LD. |
| [Siga Turismo](https://sigaturismo.com.br/) | 200 / 248.351 bytes | 35 referências extraídas dos cards do fornecedor. |

Esses números descrevem a coleta realizada, não cobertura permanente ou inventário para uma data escolhida. O parser registrou o hash da página, URL, momento da coleta e caminho do campo de preço.

## Validação integrada pelo coletor próprio

Uma segunda execução usou diretamente `createNativeCollector()` de `backend/native-http.mjs` e os quatro adaptadores de `createNativeExperienceAdapters()`, com categoria `trip`, datas solicitadas de 01 a 05/02/2027 e consulta aos robots pelo próprio coletor. O transporte respeitou a configuração de saída já existente no ambiente; não foi configurado serviço de extração ou proxy de contorno.

| Fonte | Coletado em UTC (08/10/2026) | Resultado integrado |
|---|---|---|
| Civitatis | 03:10:39.697 | 6 referências, atividades e transfers; 2 requisições HTTP. |
| Tiqets | 03:11:10.857 | 7 referências de ingressos; 2 requisições HTTP. |
| Siga Turismo | 03:11:24.996 | 35 referências, atividades e transfers; 2 requisições HTTP. |
| GetYourGuide | Durante a mesma execução | `NETWORK_ERROR` no transporte configurado; nenhum resultado foi fabricado nem reaproveitado do primeiro teste. |

Nas três coletas bem-sucedidas, `requestedDatesMatched` permaneceu falso: os catálogos consultados não confirmaram disponibilidade nas datas de fevereiro. Civitatis e Tiqets retornaram os mesmos hashes registrados abaixo. Siga retornou uma versão atualizada, SHA-256 `80c65cd9444cecde475f45aca2f85c433ebb5b177e9aee5fea2dc840e7635fb2`. O preço inicial de R$ 194 permaneceu igual.

## Amostras e consistência monetária

- **Civitatis:** uma atividade completa de Porto Alegre exibia **US$ 100,10**; seu JSON-LD declarava o mesmo número com moeda BRL. O parser manteve **USD**, extraído junto do número no card, e registrou o conflito. Uma referência de transporte aeroporto–Gramado exibia **USD 26,88**. Nenhuma conversão cambial foi realizada.
- **Tiqets:** o primeiro produto de entrada e visita guiada às obras-primas do Louvre trazia **GBP 54,27** no JSON-LD. O menor agregado do local (**GBP 24,59**) correspondia a outra experiência relacionada; não foi rotulado como ingresso do museu.
- **GetYourGuide:** a primeira caminhada histórica em Porto Alegre apresentava **BRL 179**, consistente com o preço visível da página. O início publicado não foi confundido com uma data solicitada pelo cliente.
- **Siga Turismo:** o primeiro city tour semipanorâmico apresentava **BRL 194**, com indicação de preço por pessoa e mínimo de duas pessoas. Esses campos foram preservados sem multiplicação para formar uma cotação de grupo.

Hashes SHA-256 dos corpos HTML recebidos:

```text
Civitatis    812948adc4ed4677f6af219b0e191c171f704fbfe0e139d29aa4600b74f0192d
Tiqets       5d2f7aa26b41748a92f8ceb073d167dac81603a1b39a0c4892610db6e9b2c04e
GetYourGuide 4c46fe4c3bf5f1d75a4c2db724b76a91b32847ddfe0314e44315b689a85bacd2
Siga         8b3d46eec71deda1a8c0afa26ee6d5ab56efc8b94f7d3eeb4efecc0d0d213b57
```

## Restrições observadas

- Civitatis permite as páginas públicas consultadas; bloqueia caminhos de API, carrinho e confirmações. Esses caminhos não foram usados.
- Tiqets bloqueia `/web_api/`, `/v2/` e `/search*`; o coletor usa somente o catálogo público conhecido.
- GetYourGuide bloqueia, entre outros, consultas com `date_from` e caminhos de checkout. Nenhum parâmetro de data foi usado nesta coleta.
- Siga permite pesquisa pública; caminhos administrativos, carrinho e checkout não foram utilizados.

## Cobertura implementada

`backend/native-experiences.mjs` fornece parsers próprios de cards Civitatis/Siga e JSON-LD Tiqets/GetYourGuide, além de quatro adaptadores que recebem o coletor HTTP comum. As URLs são obtidas de um mapa fechado de destinos e caminhos observados, não de entrada arbitrária do usuário.

Civitatis inclui Porto Alegre e destinos presentes em sua navegação pública; GetYourGuide e Siga começam por Porto Alegre. Tiqets começa pelo catálogo do Louvre em Paris, com aviso explícito de cobertura limitada. Outros destinos retornam aviso sem consulta. Isso é uma primeira cobertura real, não uma busca mundial concluída.

Todas as ofertas usam `price.basis: from`, `details.priceKind: published`, `requestedDatesMatched: false`, `bookable: false`. Impostos, número de participantes, disponibilidade e condições continuam desconhecidos quando a página não os informa. Não há emissão, reserva ou pagamento. O suporte a transfers descreve referências publicadas, não uma cotação porta a porta para aeroporto, horário e veículo definidos.

Os adaptadores se identificam como `dateIndependent: true`: variar as datas não cria novas consultas de disponibilidade neste catálogo. Uma busca de viagem completa extrai atividades, ingressos e transfers da mesma página em uma única chamada por fonte. A evidência inclui `documentUrl`, `parserVersion`, `rawPrice`, `rawCurrency`, `path`, `excerpt`, `sha256` e o instante `collectedAt` da oferta.

Os testes de `tests/native-experiences.test.mjs` usam fixtures pequenas sintéticas, separadas desta evidência real. Verificam o conflito de moeda, escopo tarifário, distinção de categorias, exclusão de produtos esgotados, URLs permitidas, orçamento de rede e preservação de mínimos de passageiros.
