# Portal integrado — 29/09/2026

Esta versão substitui as telas do portal no projeto original. A landing page principal, o Supabase existente e a integração Granatum permanecem no mesmo projeto. Não há reset, carga de demonstração ou migração destrutiva.

## Dados preservados

A conferência anterior à publicação encontrou, na agência com dados, 96 clientes, 40 viagens, 46 documentos, 3 modelos, 4 roteiros e 2 propostas. O estado existente passou pela validação nova sem alteração. O financeiro separado contém 1.296 lançamentos e 46 registros de catálogo. Uma cópia privada do estado foi guardada em `.local-backups/`, ignorada pelo Git. Os uploads continuam no armazenamento privado original.

O catálogo acrescenta Horizonte e Atlas apenas na apresentação, sem substituir `templates` existentes. Vínculos antigos de roteiros e documentos são preservados. Salvamentos continuam protegidos pela versão do registro; acessos simultâneos recebem conflito em vez de sobrescrever silenciosamente.

## Roteiros

- Horizonte · Editorial: fotografia ampla, programação por capítulos e cores da agência.
- Atlas · Concierge: capa dividida e programação compacta para consulta.
- Prévia e impressão usam o mesmo documento, com logos TravelPro e Europlus. As cores e o logo configurados nas propostas são reaproveitados.
- O card Meu modelo oferece upload do arquivo da agência. PDF, DOCX, TXT, MD, PNG, JPEG e WebP, até 3 MB. O original fica privado e acessível no card. TXT/MD alimentam o texto editável; PDF/Word permanecem como referência, sem prometer conversão de diagramação.
- A programação deve ser revisada pela agência. Vínculos com viagens novas continuam exigindo confirmação de reserva, pagamento e emissão. Nenhuma tarifa ou reserva é inventada.

## COS e prints

- Identificar informações consulta a disponibilidade atual do servidor, mesmo que a conexão tenha sido ativada depois de abrir a tela. Falhas mantêm o material e liberam nova tentativa; requisições possuem limite de espera.
- Pedidos diretos de extração/cadastro no chat usam a mesma análise estruturada de texto e imagens do formulário. O resultado abre revisão antes de criar cliente e atendimento.
- Um arquivo anexado pode ser organizado pelo COS: tipo, cliente e viagem são apresentados para confirmar; a execução reutiliza o documento guardado e preserva vínculos anteriores. Homônimos exigem escolha. Esta organização não interpreta o conteúdo do PDF.
- Operações com documentos funcionam sem IA. Interpretação livre e de prints requer chave/modelo OpenAI configurados no servidor. Na conferência, não havia integração de IA gravada no Supabase nem chave no `.env` local; as variáveis privadas da Vercel não foram verificadas.

## Publicação

Manter as três variáveis Supabase e o domínio público já configurados. Não trocar o projeto/banco ou a chave de cifragem existente. O push da branch principal deve acionar o deploy se a integração Git da Vercel estiver ativa.

Para ativar IA, configurar `OPENAI_API_KEY` e `OPENAI_OPERATIONS_MODEL` (ou `OPENAI_MODEL`) somente no servidor, ou usar a configuração restrita da equipe TravelPro. Nunca guardar chaves em arquivos públicos.

A migração aditiva `20260929_session_activity.sql` só é necessária antes de ativar `TRAVELPRO_SERVER_IDLE_ENFORCEMENT=true`. A flag permanece desativada por padrão para não bloquear bancos ainda sem essa função. Não aplicar scripts de reset/seed.

WhatsApp real, assinatura e Open Finance continuam condicionados à configuração e homologação de seus provedores. Cadastrar um número não substitui autorização da Meta. Nenhuma mensagem foi enviada a clientes durante a verificação.
