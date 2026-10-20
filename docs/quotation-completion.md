# Da pesquisa à proposta

Atualização de 20/10/2026.

## Fluxo disponível

1. Pesquise as datas e os viajantes em **Cotações**. A seleção automática prioriza consultar mais fontes nas datas principais antes de gastar o limite com datas flexíveis.
2. Compare os resultados e use **Organizar viagem**. Na pesquisa com várias categorias, o filtro de serviço ajuda a separar hotéis, voos e outras referências.
3. **Preparar cotação da seleção** reúne o total apenas quando todas as opções selecionadas têm totais recentes em BRL, mesma viagem e ocupação, sem alternativas duplicadas. Preços publicados, por pessoa, diárias, moedas diferentes ou referências históricas não entram silenciosamente na soma.
4. Revise a cotação. Hospedagem não exige origem; um serviço de um dia pode ficar sem data final. A validade continua sendo preenchida pela agência após conferência.
5. Escolha o preço final, acréscimo ou margem. A ação **Usar preço pesquisado como custo** é explícita e só deve ser usada quando o valor representar o total a pagar ao fornecedor. A busca não classifica automaticamente uma tarifa pública como custo líquido contratado.
6. Salve a cotação. Em **Preparar proposta em PDF**, escolha um cliente da agência ou cadastre um novo pelo nome. A ferramenta cria o atendimento e a proposta vinculados, abre o editor existente e permite visualizar/baixar o PDF com a identidade da agência.

Preparar a proposta não envia mensagens, cobra, reserva ou emite. A cotação vinculada é uma cópia preservada da versão usada. Editar a cotação avulsa não altera uma proposta anterior. Uma repetição da mesma conversão para o mesmo cliente abre a proposta existente; falhas de salvamento mantêm o estado pendente para tentar novamente sem duplicação.

Custos e resultado da agência ficam na cotação interna. O orçamento e o PDF recebem o preço de venda, inclusões e condições comerciais. Não copiam `privatePricing`.

## Continuidade e recuperação

Trocar entre serviços mantém destino, datas e viajantes. A transição para voos resolve somente aeroportos não ambíguos; a agência escolhe explicitamente quando há várias opções. Alterar destino ou ocupação atualiza as fontes sem recriar o formulário, evitando perda de foco e de cliques ao sair do campo.

Ao repetir uma pesquisa, os resultados anteriores continuam identificados durante o carregamento. Se a nova consulta falhar, a seleção e a comparação anteriores permanecem disponíveis; a validade original não é renovada. Os planos salvos continuam exigindo reconsulta quando retomados.

## Verificação real e limitações

A rodada de 20/10/2026, iniciada às 17:04 em Brasília, retornou 48 opções: cinco tarifas de quartos Laghetto com total para 22–27/11/2026, dois adultos e um quarto; 27 ofertas aéreas publicadas; seis experiências publicadas; sete ingressos publicados; três pacotes de carro publicados. GetYourGuide falhou e Siga Turismo excedeu o prazo. Essas falhas não foram tratadas como ausência de disponibilidade. A evidência resumida está em `quotation-live-verification-20261020.json` e o script de reprodução é `npm run test:native:live`.

Esta entrega fecha a passagem da pesquisa para cotação e proposta. Não amplia o inventário atual nem declara disponibilidade mundial, tarifas aéreas emitíveis, reserva, seguros ou pagamentos integrados. As APIs externas dependem de credenciais e homologação. Veja `native-search.md` para a cobertura efetiva de cada coletor.

Os testes cobrem consolidação e bloqueios de soma, filtros, preservação de resultados, foco do formulário, escolha explícita do custo, preço privado, proposta/PDF no fluxo do portal, versões antigas, cliques repetidos e recuperação após falha de gravação. Os testes de interface usam DOM em jsdom; a instalação do navegador de teste não foi concluída neste ambiente.
