# Revisão do portal — 29 de setembro de 2026

O trabalho foi aplicado à prévia local na porta 4187. A base da prévia foi preservada. Não houve publicação, alteração de dados do sistema oficial, envio a clientes ou contratação de serviços.

## Alterações entregues

- Documentos: contrato, proposta, modelo da agência, voucher, passaporte, RG, CPF, CNH, visto, seguro, bilhete aéreo, reserva de hotel, comprovante, autorização de viagem, certidão, vacinação, roteiro e outros arquivos. Anexo privado de até 3 MB; vínculos opcionais a vários clientes e a uma viagem; validade; preservação do anexo anterior ao substituir. O perfil do cliente oferece acesso aos documentos vinculados.
- Clientes: seleção de tipo de identificação, datas nativas e anexo opcional no cadastro. Nome é obrigatório; contato e identificação podem ser completados depois.
- COS: orientação compartilhada entre os servidores local e Supabase, respostas sobre uso do produto e ações que abrem o fluxo apropriado. A extração de conversa/print abre um rascunho para revisão e confirmação. Não executa livremente alterações por comando textual.
- Valores: entrada brasileira com `R$`, separador de milhar e centavos. O formulário mantém o valor numérico para cálculos e gravação. Listas longas de clientes, viagens e tipos recebem busca; datas mantêm o calendário nativo.
- Notificações: prioridades completas, compromissos futuros e documentos vencidos ou a vencer em 30 dias. Itens concluídos não reaparecem. São avisos internos, não push, e-mail ou WhatsApp.
- Propostas e atendimentos: filtros compatíveis com as etapas atuais. A cópia de atendimento não reaproveita emissão, pagamento ou roteiro de uma viagem anterior. O roteiro continua após confirmação da reserva, pagamento e emissão.
- Meu plano: condições em definição, sem ofertas ou contratação simulada. Faturamento conserva dados da agência; nenhuma cobrança é criada. Faturas demonstrativas legadas, se existirem na base, continuam identificadas como demonstração.
- WhatsApp: registro do número da agência e orientação das etapas de autorização. Salvar um número não o conecta à Meta. A implementação existente de envio de proposta com PDF, controle da janela de atendimento e confirmação do provedor foi preservada.
- Assinatura: preparação de signatários vinculados ao documento, com rascunho salvo. Alterar o documento exige nova revisão da preparação. Não há envio para assinatura nesta etapa.
- Visual: logo final no cabeçalho, tratamento de relevo discreto nos campos, cartões, botões e modais, com contornos e foco visíveis.
- Travel Match e Vuei: identificados como em desenvolvimento, sem viagens fictícias apresentadas como reais e sem atribuição de planos ainda não definidos.

## Financeiro e sistema oficial

A integração Granatum existente foi preservada. A suíte verifica importação, identificadores de origem, saldos iniciais, baixas, estornos, transferências, isolamento entre agências e proteção contra alterações indevidas em registros importados. Isso não comprova igualdade dos saldos com a conta real da agência.

Ainda falta o endereço/acesso de referência do sistema oficial para comparar telas, período, contas e dados da esposa do responsável. A prévia usa uma base distinta. Não migrar nem sobrescrever a base oficial apenas por a interface estar validada.

## Segurança

Atualizações automáticas em segundo plano não renovam a sessão local. O navegador acompanha interação real, avisa antes da expiração e oculta os dados ao encerrar. Alteração de senha, revogação de outros acessos, autenticação, CSRF e isolamento por agência são cobertos pelos testes existentes.

Para proteção de inatividade no **servidor Supabase**, aplicar `supabase/migrations/20260929_session_activity.sql` e então configurar `TRAVELPRO_SERVER_IDLE_ENFORCEMENT=true`. A migração foi testada em banco PostgreSQL isolado, mas não aplicada ao sistema oficial. O padrão permanece desativado para não interromper instalações sem a nova tabela. Sem essa ativação, o Supabase tem o encerramento de inatividade no navegador, mas não a nova fiscalização no servidor. MFA continua não implementado e é informado na interface.

## Serviços externos: decisão e próximos passos

**Clicksign é a opção proposta para assinatura.** Sua API trabalha com envelopes, documentos, signatários e eventos. A integração deve preservar a versão enviada, acompanhar eventos com validação de autenticidade e guardar o PDF assinado e evidências no documento original. Referência: [documentação oficial](https://developers.clicksign.com/).

Preparação funcional entregue: seleção e gravação de signatários e revisão do documento. **Pendente:** conta e credenciais, adaptador da API, webhooks autenticados e homologação completa de envio/assinatura/recusa/expiração. O endpoint de envio continua sem executar operações externas; não confundir rascunho com assinatura.

**Pluggy é a opção proposta para Open Finance.** O fluxo recomendado passa pelo Connect Widget, com autorização do responsável na instituição. Contas e transações alimentam uma área de conferência antes da conciliação. Referência: [criação de conexão de Open Finance](https://docs.pluggy.ai/en/docs/open-finance/creating-item).

Preparação entregue: orientação de conexão e plano de implantação. **Pendente:** contratação, credenciais, Widget, callbacks, armazenamento dos vínculos por agência, importador e interface de conciliação. O extrato deve ter chave única por provedor/conta/transação. Não criar uma segunda receita/despesa quando o mesmo fato já estiver no Granatum: primeiro sugerir o vínculo, depois confirmar a conciliação. Granatum só deve ser substituído após validar saldos, histórico, baixas e relatórios em paralelo.

**WhatsApp Business:** usar a Cloud API e o fluxo oficial de autorização da Meta. Embedded Signup permite o onboarding da agência; coexistência com o aplicativo depende de elegibilidade. Referência: [coleção oficial Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup).

Preparação entregue: número e data da solicitação registrados, configuração técnica restrita à equipe, recepção/envio já existentes preservados e mensagens honestas de disponibilidade. **Pendente:** fluxo de autorização Meta, aprovação do aplicativo/empresa, número verificado, credenciais, webhook HTTPS e modelos aprovados para iniciar conversas fora da janela. O envio automático de todo tipo de material além da proposta exige o adaptador específico; salvar o número não habilita esses envios.

**IA:** não há chave OpenAI configurada na prévia. Suporte guiado e formulários de revisão funcionam. Conversa livre, leitura de prints e geração de conteúdo dependem de chave/modelo válidos e teste com o serviço. Nenhuma ativação fictícia foi feita.

## Verificação

- Suíte completa: 120 testes aprovados, incluindo backend local, Supabase isolado, financeiro/Granatum, documentos, propostas/PDF, WhatsApp com provedores substituídos, extração revisada, campos monetários e migração de inatividade.
- Após os últimos ajustes, 24 testes direcionados também passaram, incluindo dois casos novos de preparação de assinatura e número do WhatsApp.
- Conferência no navegador das vinte áreas do portal, além dos formulários de cliente, documento e lançamento. Conferência de desktop e janela estreita.
- Serviços externos não foram acionados. Os testes de provedores são isolados; não comprovam uma conta de produção conectada.

O portal evoluiu funcionalmente, mas ainda **não está pronto para operar todas as integrações em produção**. As dependências acima precisam ser resolvidas e homologadas com a agência.
