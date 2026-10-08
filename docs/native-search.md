# TravelPro: busca, coleta e organização próprias

## O que foi construído

O TravelPro acessa as páginas públicas das fontes, lê o HTML recebido, extrai dados com parsers próprios, verifica sua consistência e organiza os resultados. Esse caminho não chama GeckoAPI, SearchApi, SerpApi ou outro serviço de extração. Esses serviços continuam disponíveis como opções adicionais.

O código não executa uma busca manual por trás nem exige copiar preços. O pedido da tela é enviado ao servidor e distribuído aos coletores. Cada preço mantém a página, horário, valor original, moeda, seletor ou caminho do dado e hash do documento consultado.

As partes próprias estão em `backend/native-http.mjs`, `native-stays.mjs`, `native-transport.mjs`, `native-experiences.mjs` e `native-travel.mjs`. O motor de distribuição é `backend/travel-search.mjs`; a interface e o organizador estão em `dist/travel-search.js`.

## Execução real comprovada

Uma execução integrada em 8 de outubro de 2026, a partir de 03:14 UTC (00:14 em Brasília), obteve os resultados abaixo. São registros históricos, não preços garantidos para compra posterior.

| Categoria e fonte | Resultado observado | O que o preço representa |
|---|---|---|
| Hospedagem — Laghetto Rio Grande | 5 tarifas de quartos; exemplo R$ 1.434,93 | Total para 10 a 15/11/2026, 2 adultos, 1 quarto, com impostos informados pelo hotel. |
| Voos — GOL e Azul | 27 ofertas publicadas para POA–CGH | Referências com as datas reais da publicação; ainda não é seleção de voo com disponibilidade para todos os viajantes. |
| Passeios e transfers — Civitatis e Siga Turismo | 41 referências | Preços publicados, sem confirmar dia, horário e participantes. Moeda de origem preservada. |
| Ingressos — Tiqets | 7 referências do Louvre | Produtos publicados, alguns combinados com visita guiada; disponibilidade por data pendente. |
| Carros — Movida Pré-Pago | 3 pacotes de cinco diárias | Pacotes com regras de resgate, não reserva de um veículo em uma loja e período. |

Total dessa rodada: **83 resultados observados, sendo 5 tarifas de hospedagem com total conferido**. GetYourGuide apresentou falha de rede; os outros resultados permaneceram disponíveis. O arquivo [native-live-verification.json](native-live-verification.json) registra entradas, horários, situações das fontes e exemplos com evidência. Não contém respostas inventadas ou credenciais.

No quarto Luxo com cama de casal do Hotel Laghetto Rio Grande, a página forneceu subtotal público de R$ 1.379,74, impostos de R$ 55,19 e total de R$ 1.434,93. O parser comparou esses valores com os atributos públicos da tarifa, além das datas, adultos, moeda, quarto e tarifa. Não multiplicou uma diária arredondada para estimar o total.

## Como usar

1. Instale as dependências e execute o servidor com Node.js 24: `npm install` e `npm start`.
2. Entre no portal e abra **Cotações**. Os coletores próprios aparecem prontos sem chave de API.
3. Escolha a categoria ou **Viagem completa**. Informe destino, período e viajantes. Para incluir voos na busca da viagem completa, preencha os aeroportos IATA.
4. Use **Datas do pedido** para procurar correspondência ao período ou **Oportunidades** para explorar publicações de outras datas. Essas publicações ficam numa seção separada.
5. Na hospedagem, **Ver quartos** aprofunda a pesquisa no hotel escolhido. Quando existe total conferido em BRL, **Revisar cotação** abre o formulário existente, sem salvar automaticamente.
6. **Organizar viagem** reúne até 12 opções. Dê um nome e salve o plano na agência para retomá-lo depois; é possível manter até 30 planos. Referências salvas precisam de reconsulta antes de compor um subtotal. Alternativas e preços por pessoa, diárias ou publicações não são somados como se fossem o total da viagem. **Baixar seleção** continua exportando um JSON.
7. Use a atualização da oferta para consultar a fonte novamente, sem reaproveitar o cache de preços. A ferramenta compara apenas o mesmo produto e condições; a substituição no organizador exige aceitação explícita. Veja [continuidade da pesquisa](search-continuity.md).

O formulário de cotação mantém o cálculo privado de acréscimo, margem, serviço e custos de pagamento. Uma tarifa pública não é automaticamente um custo líquido negociado. O formulário exige revisão e validade; a pesquisa não efetua reserva ou cobrança.

## Reproduzir a verificação

```sh
npm run test:native:live
# Ou guardar a evidência completa de uma nova rodada:
node scripts/verify-native-search.mjs --output /tmp/travelpro-native-live.json
```

O script usa apenas coletores próprios, com datas futuras, sem criar contas, gravar dados de clientes, enviar mensagens, reservar ou pagar. Ele consulta Rio Grande, ofertas aéreas POA–CGH, experiências em Porto Alegre, ingressos do Louvre e pacotes Movida. As ofertas e os números podem variar a cada execução; uma fonte pode recusar acesso ou estar indisponível. O script retorna erro se nenhuma consulta produzir resultado.

`npm test` executa testes controlados, sem depender da disponibilidade de sites externos. Inclui contratos de HTML reais reduzidos, moeda, pontos versus dinheiro, taxas, ocupação, acesso, limites, falhas parciais e interface.

## Cobertura e limites atuais

- **Laghetto:** catálogo verificado de hotéis da rede em Gramado, Canela, Bento Gonçalves, Porto Alegre, Rio Grande, Rio de Janeiro e São Paulo; um quarto sem crianças. Lista inicial e até dois hotéis aprofundados por consulta; seleção explícita de hotel lê só sua página. Não equivale à rede mundial de hotéis.
- **GOL e Azul:** páginas públicas de ofertas, incluindo rotas saindo de Porto Alegre. A presença de uma rota no formulário não garante que ela esteja publicada na página consultada. Não há busca de estoque por passageiro, seleção completa de ida/volta ou emissão.
- **Civitatis:** cidades mapeadas a partir de navegação pública, incluindo Porto Alegre e destinos internacionais. A fonte pode mostrar USD mesmo numa página em português; a moeda visível é mantida.
- **Siga Turismo:** catálogo do fornecedor de passeios na região de Porto Alegre. Restrições, como mínimo de participantes, são preservadas.
- **Tiqets:** catálogo público do Louvre, em Paris. Não é cobertura mundial de ingressos.
- **GetYourGuide:** parser e fonte mapeada de Porto Alegre; a execução integrada apresentou erro de rede. Não tratamos essa falha como ausência de oferta.
- **Movida:** produtos pré-pagos de cinco diárias. Não confirma loja, data, categoria disponível, condutor ou caução de uma reserva.
- **Booking e Hoteis.com:** não houve coleta automatizada quando a fonte apresentou desafio ou restrição explícita de acesso. LATAM, Localiza e Unidas não foram apresentados como cotadores prontos sem evidência suficiente.
- **Seguros, reserva, emissão e pagamento:** ainda não implementados nesta camada. Não há monitoramento contínuo, histórico de promoções, alerta automático ou coleta de toda a internet.

Detalhes das fontes: [hospedagem](native-stays-evidence.md), [transporte](native-transport-evidence.md) e [experiências](native-experiences-evidence.md).

## Operação e proteção dos dados

O parser HTML usa `jsdom` 26.1.0 fixado, compatível com a configuração padrão de módulos da Vercel. A publicação executa `scripts/verify-serverless-startup.mjs` para importar a API com `--no-experimental-require-module`; falhas impedem a conclusão do build. Essa verificação foi acrescentada após reproduzir a incompatibilidade de `jsdom` 29 com essa configuração. Não exige mudar `NODE_OPTIONS` no servidor.

Os coletores próprios são habilitados por padrão. `TRAVELPRO_NATIVE_SEARCH=false` desativa essa camada no servidor. As chaves opcionais de GeckoAPI/SearchApi/SerpApi continuam privadas e não são necessárias para a coleta própria.

O servidor só acessa hosts e rotas definidos no código. Não existe um endpoint de URL arbitrária. As regras públicas de robôs são verificadas, desafios e bloqueios encerram a coleta, e não há rotação de identidade, resolução de CAPTCHA ou acesso a endpoints autenticados.

O transporte normal valida DNS e fixa um endereço público na conexão HTTPS. Em ambientes que já fornecem `NODE_USE_ENV_PROXY=1` e `HTTPS_PROXY`, ele utiliza a saída de rede configurada e delega a resolução/proteção DNS a essa infraestrutura; não altera sua configuração. A execução desta sessão usou essa saída padrão. Scripts das páginas nunca são executados.

Limites: até 12 invocações de conectores por busca, três em paralelo, 25 segundos no motor, 20 segundos por leitura, até 2 MiB por documento. Cada leitura pode fazer até oito requisições HTTP, incluindo robots e redirects; a hospedagem lê até três documentos por invocação. O total observado aparece em `summary.networkRequests`. Esses são limites distintos: uma consulta à fonte pode exigir mais de um GET.

O cache de ofertas é em memória, por agência, conector, configuração e pedido, por até cinco minutos. O horário original é preservado. `expiresAt` é prazo técnico de atualização, não garantia comercial do fornecedor. A coleta não persiste HTML bruto nem credenciais no espaço da agência.

## Continuidade

A camada própria já coleta e produz tarifas verificadas de hospedagem. A expansão exige validar novas fontes e rotas com o mesmo rigor: data, ocupação, unidade, moeda, taxas e disponibilidade. O limite atual de voos e demais categorias é o acesso ao estoque e à seleção final, não a falta de uma tela ou de um orquestrador. A próxima etapa deve avançar esses fluxos fonte por fonte sem apresentar preços publicados como reservas confirmadas.
