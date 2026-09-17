# Integração Granatum

A integração lê o Granatum e mantém uma cópia financeira por agência. Não cria nem altera dados no Granatum. Lançamentos e cadastros importados ficam protegidos contra edição manual no TravelPro.

## Uso no portal

O Financeiro exibe a última leitura, eventuais erros e os botões **Ver todo o período** e **Sincronizar agora**. Responsáveis pela agência podem retomar ou reiniciar uma leitura. A agenda verifica trabalhos pendentes a cada minuto e inicia uma nova leitura uma hora após concluir a anterior. Uma falha mantém a última importação válida; após cinco minutos, o servidor tenta retomar.

Todos os lançamentos disponibilizados pela API são consultados, sem limitar datas, incluindo contas inativas e compromissos futuros já gerados. Recorrências infinitas entram conforme o Granatum disponibiliza suas ocorrências. A integração não inventa ocorrências futuras.

Transferências são consolidadas em um lançamento com duas contas, usando o sinal dos valores originais. Os IDs dos dois lados são preservados. Itens compostos são identificados pelo próprio ID para evitar duplicação. Os valores e datas de baixas vêm do Granatum. Exclusões posteriores à primeira importação são recebidas pelo filtro `excluido_apos` e tornam o registro cancelado no TravelPro, com histórico; ausências na paginação não causam exclusões automáticas.

As contas Granatum mostram o saldo informado pela API na última leitura. Não se presume um saldo inicial desconhecido. Use contas TravelPro separadas para lançamentos manuais. Categorias, contatos, centros, formas de pagamento, tags e referências dos anexos são preservados; os arquivos dos anexos permanecem no Granatum.

## Instalação e credenciais

1. Aplicar as migrações financeiras anteriores e `20260919_granatum.sql` e `20260921_granatum_opening.sql` no Supabase, que já possui Vault.
2. Preencher somente `GRANATUM_API_TOKEN` no `.env` local. O arquivo é ignorado pelo Git.
3. Vincular explicitamente a agência e importar:

   `node scripts/granatum-sync.mjs --workspace UUID_DA_AGENCIA --connect`

4. Publicar a API e as telas. Aplicar `20260920_granatum_schedule.sql` somente depois do deploy. Conferir o domínio nessa migração se estiver usando outro ambiente.
5. Validar a cópia com `node scripts/verify-granatum.mjs UUID_DA_AGENCIA`.

O token fica cifrado no Supabase Vault, associado a uma única agência. Não é enviado ao navegador nem precisa ser copiado para variáveis públicas da Vercel. A configuração recusa reutilizar uma conexão com outro token sem um procedimento de rotação, para não misturar empresas. O agendamento possui uma credencial própria no Vault, diferente do token Granatum.

O acesso às tabelas, funções administrativas e dados brutos é restrito ao servidor. A API determina a agência pela sessão, exige responsável para sincronização manual e autentica o cron com sua credencial dedicada.

## Integridade e retomada

Uma execução exclusiva por agência usa lease e cursor duráveis. Cada página salva dados brutos e progresso em uma transação. A leitura é paginada em até 500 registros, respeitando intervalo mínimo de 1,7 segundo entre chamadas. Contagens e IDs repetidos são conferidos antes da importação. Mudanças na paginação exigem reiniciar a leitura, sem publicar uma cópia incompleta.

Somente após validar toda a leitura, uma transação aplica os registros e o histórico. Repetir uma importação sem alterações não duplica lançamentos nem eventos. Os dados TravelPro existentes permanecem intactos. Saldos iniciais identificados em `contas/:id` são preservados como registros próprios, excluídos de receitas/despesas e somados uma única vez ao saldo calculado. A migração `20260921_granatum_opening.sql` aplica essa regra aos relatórios.

O processamento assistido limita a leitura a 100 mil registros; bases maiores exigem outro dimensionamento. A sincronização completa, em vez de depender apenas de alterações recentes, também captura ocorrências futuras recém-geradas.

## Referências e testes

[API oficial Granatum](https://static.granatum.com.br/financeiro/api/), [Supabase Vault](https://supabase.com/docs/guides/database/vault) e [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).

`npm test` verifica normalização, transferências, compostos, transporte somente de leitura, proteção de credenciais, exclusividade, reexecução, exclusões, permissões e regressões do financeiro. A conferência real compara cada registro e os totais com os dados brutos recebidos, sem imprimir valores nem credenciais.
