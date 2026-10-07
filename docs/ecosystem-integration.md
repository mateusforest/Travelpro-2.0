# TravelPro, Travel Match e Vuei

O TravelPro é o emissor da identidade. O titular de um workspace operacional,
com e-mail confirmado, pode entrar nos serviços pelos botões das seções Match e
Vuei. Não há senha compartilhada nem credencial administrativa no navegador.

## Fluxo

1. `/api/travelpro/start` no destino grava estado e verificador PKCE em cookie
   HttpOnly/Secure/SameSite=Lax, válido por dez minutos.
2. A tela de continuação no TravelPro identifica a agência e os dados que serão
   transferidos. O POST autenticado exige origem local, titularidade e e-mail
   confirmado. O registro é sempre carregado do workspace autenticado.
3. O código aleatório de 256 bits dura dois minutos. Seu conteúdo fica cifrado
   em `travelpro_integrations`, sob serviço `ecosystem-code:<hash>`. Os registros
   vencidos são removidos a cada autorização da agência.
4. O callback confere o estado e troca o código entre servidores. O emissor
   confere o destino e o PKCE e apaga o código atomicamente antes de responder.
5. O destino preserva contas com o mesmo e-mail, confere titularidade/status e
   impede vincular uma conta já conectada a outro usuário/workspace. Contas
   master e membros de outras agências não são promovidos pelo fluxo.
6. O destino emite a própria sessão Supabase. O benefício incluído fica em
   `app_metadata`, alterável apenas no servidor, por 24 horas; entrar novamente
   pelo TravelPro o renova. Não altera assinaturas Stripe nem saldo de IA.

## Dados e idempotência

- Match: importa proposta como pacote **draft**, sem campos de contato,
  documentos ou notas internas. Preço por viajante calculado a partir dos itens
  e desconto. Publicação e revisão permanecem explícitas na interface do Match.
- Vuei: importa título, destino, datas, quantidade de viajantes e contato do
  titular para uma viagem de agência **draft/private**. Não copia anexos nem
  publica links automaticamente.
- IDs derivados de workspace + registro tornam os envios repetidos idempotentes.
  Registros existentes são abertos, sem sobrescrever edições no destino.
- Não há sincronização contínua nem cancelamento automático de assinaturas
  existentes. Colaboradores devem usar os fluxos de convite dos destinos;
  o acesso unificado inicial é restrito ao titular do TravelPro.

## Operação

URLs de emissão e retorno são fixas para os três domínios de produção.
Sem nova migração ou segredo compartilhado: usa a tabela de integrações e a
chave de criptografia já presentes no TravelPro e as credenciais Supabase
administrativas já configuradas nos servidores dos destinos.

Testes: `tests/ecosystem.test.mjs`, suíte Supabase/portal do TravelPro e
`lib/travelpro-provision.test.ts` nos dois destinos. O Vuei já possui erros de
tipagem anteriores e `ignoreBuildErrors`; sua compilação de produção também
foi validada. Não declarar um envio real validado só por compilar os projetos.
