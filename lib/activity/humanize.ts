const activityLabels: Record<string, string> = {
  activity_logged: "Atividade registrada",
  workspace_created: "Empresa criada",
  workspace_updated: "Empresa atualizada",
  workspace_deleted: "Empresa removida",
  member_added: "Membro adicionado",
  member_removed: "Membro removido",
  member_updated: "Membro atualizado",
  client_created: "Cliente criado",
  client_updated: "Cliente atualizado",
  client_archived: "Cliente arquivado",
  support_ticket_created: "Chamado criado",
  support_message_created: "Mensagem enviada no suporte",
  support_status_updated: "Status do chamado atualizado",
  support_priority_updated: "Prioridade do chamado atualizada",
  support_ticket_assigned: "Chamado atribuido",
  master_support_reply: "Resposta enviada pela equipe COS",
  operation_created: "Operacao criada",
  operation_updated: "Operacao atualizada",
  operation_archived: "Operacao arquivada",
  document_created: "Documento criado",
  document_updated: "Documento atualizado",
  document_archived: "Documento arquivado",
  meeting_created: "Reuniao criada",
  meeting_updated: "Reuniao atualizada",
  meeting_archived: "Reuniao arquivada",
  connect_source_created: "Fonte conectada",
  connect_source_updated: "Fonte atualizada",
  connect_source_deleted: "Fonte removida",
  connect_section_created: "Sessao criada",
  connect_section_updated: "Sessao atualizada",
  connect_section_deleted: "Sessao removida",
  connect_action_created: "Acao criada",
  connect_action_updated: "Acao atualizada",
  connect_action_deleted: "Acao removida",
}

function detectFinancialLabel(description: string | null | undefined, labels: { income: string; expense: string; fallback: string }) {
  const normalizedDescription = (description || "").trim().toLowerCase()

  if (!normalizedDescription) {
    return labels.fallback
  }

  if (normalizedDescription.includes("ganho") || normalizedDescription.includes("receita") || normalizedDescription.includes("entrada")) {
    return labels.income
  }

  if (normalizedDescription.includes("gasto") || normalizedDescription.includes("despesa") || normalizedDescription.includes("saida")) {
    return labels.expense
  }

  return labels.fallback
}

export function humanizeActivityAction(action: string | null | undefined, description?: string | null) {
  const normalizedAction = (action || "activity_logged").trim().toLowerCase()

  if (normalizedAction === "financial_entry_created") {
    return detectFinancialLabel(description, {
      income: "Receita registrada",
      expense: "Gasto registrado",
      fallback: "Lancamento registrado",
    })
  }

  if (normalizedAction === "financial_entry_updated") {
    return detectFinancialLabel(description, {
      income: "Receita atualizada",
      expense: "Gasto atualizado",
      fallback: "Lancamento atualizado",
    })
  }

  if (normalizedAction === "financial_entry_deleted") {
    return detectFinancialLabel(description, {
      income: "Receita removida",
      expense: "Gasto removido",
      fallback: "Lancamento removido",
    })
  }

  if (activityLabels[normalizedAction]) {
    return activityLabels[normalizedAction]
  }

  const cleaned = normalizedAction.replace(/_/g, " ").trim()

  if (!cleaned) {
    return "Atividade registrada"
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}
