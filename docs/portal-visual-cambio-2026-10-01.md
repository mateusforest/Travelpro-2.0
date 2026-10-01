# Portal: visual e ferramentas do cabeçalho

O portal usa `portal-chrome.css` e `portal-chrome.js` nas 27 entradas HTML existentes. Sidebar em gradiente laranja, seleção com curva, wordmark branco, superfícies claras e parceiros no rodapé. A navegação móvel permanece no rodapé. Nenhuma migração ou alteração de dados de clientes é necessária.

## Câmbio

`GET /api/exchange` exige a sessão e o acesso à agência existentes, em SQLite e Supabase. Consulta fixa a [Frankfurter](https://frankfurter.dev/), sem enviar dados da agência, sem chave nova e sem endpoints configuráveis pelo navegador. São taxas diárias de referência, não taxas de turismo ou ofertas da Europlus. O cabeçalho mostra BRL por USD/EUR; a calculadora converte nos dois sentidos e entre moedas, informa data/fonte e exclui IOF, tarifas e spread.

Cache no processo de 30 minutos, deduplicação de consultas simultâneas, timeout de 8 segundos e intervalo de 5 minutos após falha. Em falha, uma referência recente em cache é identificada como desatualizada. Sem valor válido, a interface mostra indisponibilidade. O polling usa `X-TravelPro-Background: 1`, sem manter a sessão ativa.

## Horários

Local usa o fuso do navegador. EUA inicia com Nova York e Europa com Lisboa. O usuário pode escolher Chicago/Los Angeles e Paris/Londres/Roma/Madri na calculadora. Preferências são locais ao navegador e não mudam os dados da agência. `Intl.DateTimeFormat` respeita o horário de verão de cada cidade.

## Verificação

58 testes passaram (backend, Supabase, fluxo do portal, financeiro, sessão e câmbio), além da validação de sintaxe. Teste anterior do intake foi adaptado para abrir a funcionalidade pelo COS, pois o campo da página inicial já havia sido removido.

No navegador local: cotações reais recebidas, conversão BRL/USD e inversão, modal com foco e fechamento, visual do financeiro e atendimentos, cabeçalho e calculadora a 390px. Testes usam contas e bancos locais isolados; não alteram os registros da agência em produção.
