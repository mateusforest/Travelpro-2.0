# Migração para Travelpro-2.0-main

## Situação

A apresentação nova foi integrada ao projeto Next.js existente. A landing page, entrada, cadastro e páginas do portal usam os arquivos visuais aprovados, incluindo GSAP e o fundo HyperFrames. As páginas são entregues por rotas Next.js, sem iframe e sem executar o servidor SQLite do protótipo na Vercel.

As rotas antigas, componentes e ações de negócio foram preservados. `/app`, `/connect`, `/master` e as páginas antigas dentro de `/portal/...` continuam no código. O novo portal usa `/portal#...`. O destino padrão das contas de operação passa a ser `/portal`.

O servidor de desenvolvimento que já estava aberto neste projeto está em **http://127.0.0.1:3000/**. O protótipo anterior continua independente em 4174.

## Ativação necessária no Supabase

1. No mesmo projeto Supabase usado por `.env.local`, abrir o SQL Editor e executar `supabase/migrations/20260911_travelpro_portal.sql`.
2. Conferir os Redirect URLs da autenticação para o endereço local e o domínio publicado, incluindo `/api/travelpro/auth/callback` e `/api/travelpro/auth/callback?flow=recovery`.
3. Entrar com uma conta de agência e validar abertura do portal, criação de cliente, persistência após recarregar e upload de um arquivo de teste.

A migração é aditiva: cria tabelas privadas `travelpro_*`, funções de atualização com controle de versão e um bucket privado. Não apaga nem altera as tabelas operacionais anteriores. O servidor só acessa os novos dados após validar a identidade e a associação do usuário à agência. Contas comuns não podem alterar as configurações administrativas.

Na primeira abertura, o portal copia clientes não arquivados, documentos não arquivados e lançamentos financeiros válidos da agência para seu novo estado operacional. Os registros antigos continuam intactos. A cópia é feita uma vez: as duas interfaces não devem ser usadas para editar os mesmos registros simultaneamente. Operações antigas, reuniões e outros módulos não têm conversão automática para viagens e permanecem acessíveis na estrutura anterior.

Os dados e contas do SQLite do protótipo ASTRA não foram transferidos. Essa base continua preservada na pasta original. O acesso desta versão usa as contas Supabase existentes.

**A migração SQL ainda não foi executada nesta entrega.** A consulta de verificação confirmou acesso à tabela `workspaces` e ausência de `travelpro_state`. Não havia uma conexão administrativa SQL disponível para aplicar o arquivo. Não foi feito cadastro de teste nem escrita no banco real.

## Variáveis e integrações

As variáveis de `.env.local` foram preservadas. Na Vercel, manter as variáveis Supabase já utilizadas por esse projeto. Nunca colocar a chave administrativa em uma variável `NEXT_PUBLIC_*`.

Para salvar credenciais de integrações pelo portal, definir também `TRAVELPRO_ENCRYPTION_KEY`: 32 bytes aleatórios representados por 64 caracteres hexadecimais. Usar a mesma chave em todos os ambientes que compartilham essas credenciais. A chave não deve ser publicada no Git. O arquivo `.env.travelpro.example` documenta somente seu nome.

A IA reutiliza `OPENAI_API_KEY` e prioriza `OPENAI_OPERATIONS_MODEL`, com fallback para `OPENAI_MODEL`. Também aceita credenciais específicas da agência, cifradas no servidor. A presença de uma chave não significa que a conexão foi validada.

WhatsApp: webhook em `/api/travelpro/webhooks/whatsapp`, verificação de assinatura, registro de mensagens e leads, rascunho de IA quando habilitado e envio manual com controle de repetição. É necessário cadastrar a URL pública HTTPS na Meta. Mensagens fora da janela de resposta ainda dependem de templates a integrar.

Operadora: adaptador POST recebe `{ "type": "quote", "request": {...} }` e deve retornar `{ "currency": "BRL", "offers": [{ "name": "...", "total": 1000, "inclusions": [] }], "validUntil": null }`. O mapeamento da API da operadora depende de sua documentação.

Pagamentos, assinatura eletrônica e geração de imagens/vídeos continuam dependentes de adaptadores específicos. Alterar uma opção visual de plano não processa cobrança. O Studio mantém os modelos e a geração de legenda pela IA.

Uploads: limite de 3 MB nesta versão, para manter a requisição JSON abaixo do limite de entrada da função. Arquivos são guardados em bucket privado com prefixo da agência.

## Segurança e recuperação

- Backup completo do código e das configurações antes da alteração: `C:/Users/mateu/.codex/.chatgpt-projects/g-p-6a57226fe8c481919ac891e32751e932/travelpro-migration/backup-main`.
- O backup contém `.env.local`; é privado e não deve ser publicado ou anexado a um repositório.
- A pasta `.git`, antes vazia, foi recuperada da cópia `Travelpro-Recovery`. O remoto é `https://github.com/mateusforest/Travelpro-2.0.git`. A Recovery não foi alterada.
- Alterações que já existiam na Main foram mantidas. O status do Git inclui essas alterações anteriores, além desta migração.
- Não houve commit, push nem publicação na Vercel.

## Verificação

`node --test tests/travelpro-migration.test.mjs` verifica as rotas públicas, proteção das APIs, rejeição de origens externas, validação inicial de login e disponibilidade dos arquivos visuais. Requer o servidor em 3000 ou a variável `TRAVELPRO_TEST_URL`.

`node --experimental-vm-modules --test --test-isolation=none tests/travelpro-store.test.mjs` verifica a API real com substitutos isolados do Supabase: separação por agência, restrições para membros, conflitos de versão e gravações concorrentes. Não acessa o banco real.

A validação completa de login, gravação no Supabase, recuperação por e-mail e serviços externos deve ser realizada após a aplicação do SQL, com uma conta de teste e as configurações do ambiente de destino.
