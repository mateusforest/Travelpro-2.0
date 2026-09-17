# Financeiro TravelPro

O financeiro usa registros próprios, separados do documento da agência. Está disponível em `portal.html#financeiro` e `financeiro.html`.

## Operação

- Cadastre contas com saldo inicial e data em **Contas e cadastros**. O saldo inicial deve representar o saldo antes dos movimentos dessa data. Cadastre categorias e clientes/fornecedores financeiros.
- Crie recebimentos, pagamentos, comissões ou transferências. Parcelas dividem o valor total em centavos e avançam mensalmente, respeitando o último dia do mês. Edições posteriores alteram somente a parcela aberta.
- Vencimento representa o compromisso; competência representa o período econômico. Uma baixa registra o valor e a data efetiva e exige uma conta. São permitidas baixas parciais.
- Transferências exigem contas distintas. Suas baixas movimentam os saldos das duas contas, mas não são receita nem despesa.
- O fluxo mensal soma baixas pelas datas efetivas e saldos pendentes pelos vencimentos. O resultado previsto não é saldo bancário acumulado.
- Cancelamento, reabertura e estorno exigem motivo e permissão de responsável. Registros não são apagados; alterações mantêm histórico. Cadastros podem ser arquivados.
- A exportação CSV respeita os filtros e permite até 20 mil registros por exportação. Use períodos menores para bases maiores.

## Histórico anterior

Na primeira abertura, os antigos `state.transactions` são copiados automaticamente e uma marca impede reimportação. A cópia anterior permanece intacta no estado da agência. Uma aba antiga não pode sobrescrever o financeiro após essa migração.

Uma baixa antiga sem data continua marcada como realizada no lançamento, mas não entra no fluxo realizado nem no saldo das contas. A tela identifica essa condição. O responsável pode estorná-la, vincular uma conta e registrar a baixa com sua data correta.

## Banco e segurança

- Supabase: aplicar `supabase/migrations/20260917_finance.sql` e `supabase/migrations/20260918_finance_conflicts.sql`, nesta ordem, antes de publicar o código. A migração cria tabelas, índices e funções; não importa dados de usuário durante a execução do SQL.
- SQLite local: `backend/migrations/003_finance.sql`, aplicada pelo inicializador existente.
- A API `/api/finance` autentica o usuário e determina a agência pela associação no servidor. O navegador não recebe a chave administrativa do Supabase. Tabelas e funções não ficam acessíveis diretamente aos papéis `anon` e `authenticated`.
- Gravações usam versão por registro. Criação de parcelas usa uma chave de operação e transação única para evitar duplicação em tentativas repetidas.
- Os valores são representados em centavos. IDs externos e origem possuem restrição de unicidade por agência, preparando a futura importação.

## Próxima etapa: Granatum

A conexão ainda não está implementada. A base permite preservar origem e ID externo e distinguir registros importados. Será necessário mapear contas/categorias/contatos, centros de custo e demais campos, importar em lotes com checkpoints e reconciliar alterações e exclusões antes de habilitar uma sincronização contínua. Nenhum token Granatum é solicitado ou utilizado nesta etapa.

## Validação

`npm test` inclui cálculos, API SQLite, migração SQL em PostgreSQL isolado, permissões e fluxo de formulários. `npm run check` verifica sintaxe. `npm run test:supabase:live` exige ambiente Supabase e servidor em `TEST_ORIGIN`; cria duas contas temporárias, valida autenticação, isolamento e ciclo financeiro e remove os dados criados ao terminar.
