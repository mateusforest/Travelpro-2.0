# Publicação do TravelPro

## Vercel com Supabase

O projeto mantém as páginas de `dist/` e publica a função Node.js
`api/index.mjs`. O `vercel.json` encaminha `/api/*` à função, que usa
Supabase Auth, Postgres e o bucket privado `travelpro-private`.
Não há SQLite nem arquivos persistentes no disco da Vercel.

Configure Node.js 24, preset **Other** e as variáveis:

- `TRAVELPRO_PUBLIC_URL=https://www.usetravelpro.com`
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase existente.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública desse projeto.
- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa, usada somente no servidor.

As três variáveis do Supabase precisam estar disponíveis em Production
e Preview. Em Preview, a API usa o endereço `VERCEL_URL` daquele deploy.
Não configure `PUBLIC_ORIGIN` com endereço local na Vercel.

As tabelas e funções adicionais estão documentadas em
`supabase/migrations/20260911_travelpro_portal.sql`. No projeto Supabase
conectado, elas já existem. Não é necessário recriar o banco ou as contas.

O novo financeiro acrescenta `20260917_finance.sql` e
`20260918_finance_conflicts.sql`, nessa ordem. Ambas já foram aplicadas
ao projeto conectado. Em outro ambiente, aplique-as antes de publicar
esta versão. Veja [o guia financeiro](docs/financeiro.md) para migração e operação.

Em Supabase → Authentication → URL Configuration, use o domínio público
como Site URL e permita o callback
`https://www.usetravelpro.com/api/auth/callback`, inclusive com a consulta
`?flow=recovery`, para confirmação de cadastro e recuperação de senha.
Para desenvolvimento, permita também os callbacks no endereço local.
Esses links usam PKCE: devem ser abertos no navegador que iniciou o fluxo.

O login aceita as contas existentes do Supabase. A API verifica a identidade
e a associação à agência em cada requisição, e mantém os tokens em cookies
HttpOnly/SameSite. A chave administrativa nunca é enviada ao navegador.

`TRAVELPRO_ENCRYPTION_KEY` é opcional para login, mas obrigatória para salvar
segredos de integrações. Use 64 caracteres hexadecimais gerados aleatoriamente
e preserve o mesmo valor em todos os deploys que compartilham o banco.
Não troque essa chave se já houver segredos cifrados.

## Desenvolvimento local

1. Instale Node.js 24+ e execute `npm install`.
2. Preencha as mesmas três variáveis do Supabase no `.env`.
3. Mantenha `PUBLIC_ORIGIN` e `TRAVELPRO_PUBLIC_URL` no endereço local e
   execute `npm start`.

Com as três variáveis preenchidas, o portal local acessa o mesmo Supabase.
Com todas vazias, usa o SQLite local anterior. Configuração parcial causa
erro explícito, para evitar que o servidor abra outra base silenciosamente.
Contas do SQLite não se tornam contas Supabase automaticamente.

## Verificação

- `npm test`: testes isolados, sem alteração do Supabase real.
- `npm run check`: sintaxe dos arquivos da aplicação.
- `/api/health`: precisa retornar HTTP 200 e `storage: "supabase"`.
- `npm run test:supabase:live`: com o servidor iniciado, cria duas contas
  técnicas temporárias sem enviar e-mail, verifica login, sessão, dados,
  isolamento, arquivos e logout, e remove os dados que criou.
  `TEST_ORIGIN` permite executar essa verificação no domínio publicado.

Depois do deploy, `/api/auth/session` sem cookie deve retornar 401 em JSON,
e nunca 404 ou uma página HTML. Alterações nas variáveis da Vercel exigem
um novo deploy. Limite de upload pelo portal: 3 MB no modo Supabase.

Nunca envie `.env`, `data/`, bancos ou chaves privadas ao GitHub.
