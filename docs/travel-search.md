# Motor de busca próprio do TravelPro

## Entrega

**Atualização:** a coleta própria de sites já foi implementada e testada ao vivo; veja [cobertura, evidências e execução](native-search.md). As descrições dos conectores externos abaixo permanecem válidas, mas não são mais a única forma de obter preços. Essas chaves não são necessárias para os coletores próprios.

O TravelPro recebe um pedido único, distribui consultas entre conectores e devolve ofertas com origem, horário, escopo do preço e condições. O motor e a interface são próprios; os primeiros conectores usam serviços externos de extração. Isso reduz a dependência de uma operadora, mas não elimina os custos e contratos das fontes.

Conectores externos implementados: hotéis via Booking e Hoteis.com/GeckoAPI e Google Hotels/SearchApi ou SerpApi; voos via LATAM, GOL e Azul/GeckoAPI e Google Flights/SearchApi ou SerpApi. São nove conectores, não nove inventários independentes: SearchApi e SerpApi podem consultar a mesma origem Google.

O catálogo preserva Firecrawl, Apify, Browser Use, Stagehand, Crawl4AI, Crawlee, Bright Data, Oxylabs e DataForSEO como opções futuras. Um item catalogado não é uma integração disponível. Fornecedores de reserva e categorias adicionais estão em [contratos e fontes](travel-provider-contracts.md).

## Operação

Na tela **Cotação**, selecione hotéis ou voos, destino, datas, ocupação e fontes. Voos usam códigos IATA, por exemplo GRU e LIS. Datas flexíveis deslocam ida e volta juntas em até dois dias, mantendo a duração. O limite de consultas controla a expansão; o resultado informa quando fontes ou datas ficaram de fora.

Resultados permitem conferir a fonte, condições e selecionar opções para comparação. Quando há um total de estadia documentado em reais, a ação de revisar cotação preenche o formulário existente. O formulário exige revisão, validade e salvamento explícito. Um preço de varejo encontrado na busca não é automaticamente um custo líquido contratado. O cálculo privado de acréscimo, margem, serviço e custos de pagamento continua disponível.

Nenhum resultado é uma reserva. Em voos de ida e volta do Google, a primeira resposta exige selecionar a ida e consultar a volta; esta versão identifica essa situação, mas não executa essa seleção. Preços com base desconhecida não viram automaticamente totais de proposta. Condições e taxas desconhecidas permanecem visíveis.

## Ativação no servidor

Configure uma ou mais variáveis em `.env` local ou no ambiente de hospedagem e reinicie a aplicação:

```text
GECKO_API_KEY=
SEARCHAPI_API_KEY=
SERPAPI_API_KEY=
```

As chaves ficam somente no servidor. Não cole credenciais em HTML, código versionado ou proposta de cliente. Sem credenciais, a interface informa quais fontes aguardam configuração e não gera preços demonstrativos. A configuração é da plataforma e os custos são debitados das contas dessas chaves; não há contratação, cobrança ou gestão de saldo implementadas pelo TravelPro.

## API autenticada

`GET /api/travel-search/providers` devolve catálogo e prontidão. `POST /api/travel-search` aceita:

```json
{
  "category": "hotels",
  "destination": "Lisboa",
  "start": "2027-04-10",
  "end": "2027-04-15",
  "adults": 2,
  "childrenAges": [],
  "rooms": 1,
  "currency": "BRL",
  "providers": ["gecko-booking", "searchapi-hotels"],
  "flexDays": 1,
  "maxCalls": 6,
  "sort": "price"
}
```

Troque as datas por datas futuras. `providers: []` seleciona os conectores implementados da categoria; cada conector sem chave aparece como indisponível. A resposta contém `searchId`, pedido, ofertas, situação de cada fonte, consumo e avisos. `requestSnapshot` identifica as datas e ocupação de cada oferta, incluindo alternativas.

O servidor aplica autenticação, escopo da agência, proteção de origem/CSRF conforme o modo de execução e limitação de frequência. O cliente não escolhe outra agência. As rotas existem no SQLite e no Supabase.

## Limites e fidelidade

- Até 12 consultas a conectores por busca, três em paralelo e prazo total de 25 segundos. Não há repetição automática de chamadas pagas. Uma consulta própria pode ler mais de uma página; `summary.networkRequests` contabiliza o tráfego observado, incluindo robots e redirecionamentos.
- Cache de até cinco minutos, em memória, separado por agência, configuração, conector e pedido. Preserva o horário original. Não é reserva de tarifa nem garantia de validade; cada instância possui seu próprio cache.
- Respostas de fornecedores limitadas a 2 MB, até 100 ofertas por consulta e sem redirecionamentos. Erros retornados à interface não incluem credenciais.
- Falha de uma fonte preserva resultados das outras; fontes sem suporte à ocupação solicitada não devem produzir um preço silenciosamente para outra composição.
- Sem deduplicação por nome de hotel: quartos, alimentação, cancelamento e canais diferentes podem ter preços distintos. Preços de diária, total, trecho e valores iniciais não são tratados como equivalentes.
- Sem conversão cambial automática, garantia de cobertura mundial, captura de todas as páginas, histórico de descontos ou monitoramento contínuo.
- Reservas, emissão, pagamento e seguros dependem dos próximos conectores e contratos. Ingressos, passeios, transfer e carros possuem referências publicadas em coletores próprios; disponibilidade por data continua limitada. A API de uma operadora ou distribuidor pode ser adicionada ao mesmo motor.

## Como construir uma capacidade semelhante à GeckoAPI

A documentação pública da GeckoAPI descreve alvos específicos e uma API de extração. Não permite afirmar como é toda a implementação interna da empresa. A arquitetura que adotamos é: contrato de busca, conector por fonte, coleta, validação de dados, normalização, registro de procedência e API unificada.

Para substituir gradualmente uma fonte externa por coleta própria, cada novo conector precisa de uma fonte autorizada, navegação reproduzível quando necessária, extração verificável e manutenção quando o site muda. Bibliotecas como Crawlee, Crawl4AI ou Stagehand ajudam nessa camada; não fornecem por si só inventário contratado, tarifa líquida ou emissão. IA pode auxiliar a interpretar pedidos e recuperar seletores, mas o preço deve vir da fonte e manter sua evidência.

## Verificação e próximos passos concretos

`npm test` cobre normalização com respostas controladas, limites, erros parciais, cache por agência, autenticação e interface. As respostas dos testes são exemplos deliberados; não são cotações capturadas ao vivo. `npm run check` verifica a sintaxe.

Após configurar uma chave, execute uma busca pequena com uma fonte, datas fixas, dois adultos e um quarto; confira os mesmos dados na origem. Registre tempo, consumo real no fornecedor, unidade do preço, impostos, ocupação e disponibilidade. Repita para ida simples, ida e volta e falhas de crédito. Só depois amplie fontes e datas flexíveis. Nenhuma chave de API externa estava disponível no ambiente de desenvolvimento, portanto a homologação ao vivo desses conectores externos permanece pendente. A coleta própria já foi validada ao vivo, conforme o documento específico.

O próximo desenvolvimento de maior impacto é ampliar a cobertura da consulta de quartos já implementada e completar a seleção de voos de ida/volta. Em seguida, integrar reserva e suporte a cancelamento. O radar de oportunidades já mostra tarifas publicadas de companhias e outros serviços; histórico, alertas e monitoramento contínuo ainda não estão implementados.
