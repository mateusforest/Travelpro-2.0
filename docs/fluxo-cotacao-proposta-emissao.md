# Atendimento: cotação até roteiro

## Operação entregue

1. **Pedido:** o atendimento mantém cliente, preferências e agenda. “Fazer cotação” aparece ao lado de “Agendar”.
2. **Cotação:** o pedido reaproveita os dados disponíveis. A consulta usa o adaptador configurado pela plataforma. Sem conexão, o botão de consulta permanece indisponível; a agência pode guardar o pedido ou registrar os dados da cotação recebida por e-mail. Guardar o pedido não o envia à operadora.
3. **Proposta:** selecionar uma oferta transfere valores, itens discriminados (quando fornecidos), inclusões, condições, datas, viajantes e validade. Valores de pacote permanecem em um único item quando não há discriminação; as inclusões não duplicam o preço. Cotação vencida ou sem validade confirmada não gera uma nova proposta.
4. **Personalização:** título, mensagem, dois estilos e selo/adesivo textual. A apresentação pode ser visualizada e baixada em HTML; não foi implementado um editor livre de imagens ou PDF diagramado nesta entrega.
5. **Resposta:** a agência registra o envio já realizado e a aprovação ou o ajuste recebido, com canal/observação. Alterar uma proposta enviada ou aprovada exige nova aprovação. O portal não envia mensagens nem fornece ainda uma página pública para o cliente aprovar.
6. **Operação:** depois da aprovação, registra-se localizador, prazo com hora, link HTTPS da operadora, reserva, pagamento e emissão separadamente. Dados de cartão permanecem no ambiente da operadora. Esse acompanhamento é um registro da agência, não uma confirmação automática do provedor. Não cria recebimento no caixa da agência.
7. **Roteiro:** liberado quando reserva está confirmada, pagamento confirmado e emissão registrada. Materiais históricos permanecem acessíveis. Prazos de emissão próximos ou vencidos entram nas prioridades de Hoje.

## Contrato do adaptador de cotação

`POST /api/operator/quote` autentica a agência e valida os vínculos de cliente/atendimento. O servidor chama o endpoint HTTPS configurado pela plataforma com `type: "quote"` e `request: {trip, client, destination, origin, start, end, travelers, notes}`. Chaves permanecem no servidor.

Resposta normalizada esperada:

```json
{
  "currency": "BRL",
  "reference": "referência-da-operadora",
  "validUntil": "2026-10-01T18:00:00-03:00",
  "offers": [{
    "id": "oferta-1",
    "name": "Pacote escolhido",
    "total": 1500,
    "inclusions": ["Hospedagem", "Traslado"],
    "terms": "Condições retornadas pela operadora",
    "items": [{"name": "Hospedagem", "qty": 2, "unit": 500}, {"name": "Traslado", "qty": 1, "unit": 500}]
  }]
}
```

`items` é opcional e precisa fechar com o total em centavos. `validUntil` aceita data ou data/hora com fuso; ausência bloqueia a preparação até conferir a fonte. Uma data isolada não inventa horário de corte e é sinalizada como “horário não informado”. Campos desconhecidos, incluindo preço líquido e comissão, não são repassados ao cliente por esse contrato. O total precisa ser o preço de venda já definido na operadora, conforme o fluxo informado pela agência.

O histórico de cotações é preservado, sem sobrescrever o original. Cotações e propostas são vinculadas ao atendimento e ao cliente. Chamadas repetidas podem retornar novas cotações; preparar novamente a mesma oferta abre a proposta já existente.

## O que depende da conexão com a operadora

A integração específica depende da configuração e homologação do fornecedor escolhido. O endpoint acima é o contrato do adaptador TravelPro, não uma alegação sobre endpoints públicos de uma operadora. É necessário obter documentação, credenciais, ambientes e regras de validade, comissão, reserva e emissão da operadora.

Notificações de cotação recebida, aprovação pública e atualização automática de pagamento/emissão exigem implementações futuras: autenticação de origem, correlação por agência/atendimento/referência, identificação única do evento, proteção contra repetição e regras de precedência. Nenhum webhook público fictício foi criado. A estrutura de dados já separa essas confirmações, preserva referências e permite mapear o retorno homologado para os mesmos estados.

## Verificação

Testes isolados cobrem cópia de valores e inclusões, soma dos itens, vínculo por agência, vencimento, ausência de prazo, cotação imutável, ajuste e nova aprovação, personalização e liberação do roteiro. Nenhuma reserva, mensagem ou cobrança real foi realizada.
