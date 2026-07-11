import { createClientAction, getClientByIdAction, getClientsAction, updateClientAction } from "@/actions/clients"
import { createContractAction } from "@/actions/contracts"
import { createDocumentAction } from "@/actions/documents"
import { createFinancialEntryAction, getFinancialSummaryAction } from "@/actions/financial"
import { createMeetingAction } from "@/actions/meetings"
import { createOperationAction } from "@/actions/operations"
import { createSupportTicketAction } from "@/actions/support"
import { createTripAction } from "@/actions/trips"
import { getWorkspaceActivityLogsAction } from "@/actions/activity"
import { formatCurrencyBRL, humanizeActivityAction } from "@/lib/cos-engine/operations-response"
import { normalizeEngineText, toTitleCase } from "@/lib/cos-engine/operations-tools"
import type { OperationsEngineResult, OperationsResolvedIntent } from "@/lib/cos-engine/types"

type ResolvedClientRecord = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  notes: string
  status: string
  createdAt: string | null
}

async function resolveClientByName(clientName: string) {
  const clientsResult = await getClientsAction()

  if (clientsResult.error) {
    return { error: clientsResult.error }
  }

  const normalizedTarget = clientName.trim().toLowerCase()
  const activeClients = (clientsResult.clients ?? []).filter((client) => client.status !== "archived")
  const exactMatches = activeClients.filter((client) => client.name.trim().toLowerCase() === normalizedTarget)
  const partialMatches = activeClients.filter((client) => client.name.trim().toLowerCase().includes(normalizedTarget))
  const matches = exactMatches.length > 0 ? exactMatches : partialMatches

  if (matches.length === 0) {
    return { error: `Nao encontrei um cliente chamado ${clientName}.` }
  }

  if (matches.length > 1) {
    return { error: "Encontrei mais de um cliente com esse nome. Pode informar o nome completo?" }
  }

  return { client: matches[0] }
}

function buildExecutionSuccess(input: Omit<OperationsEngineResult, "ok" | "executionStatus">): OperationsEngineResult {
  return {
    ok: true,
    executionStatus: "executed",
    area: input.area ?? input.resolvedIntent?.area ?? null,
    entityType: input.entityType ?? input.resolvedIntent?.entityType ?? null,
    actionType: input.actionType ?? input.resolvedIntent?.actionType ?? null,
    targetReference: input.targetReference ?? input.resolvedIntent?.targetReference ?? null,
    clarificationQuestion: input.clarificationQuestion ?? input.resolvedIntent?.clarificationQuestion ?? null,
    unsupportedReason: input.unsupportedReason ?? input.resolvedIntent?.unsupportedReason ?? null,
    unresolvedReference: input.unresolvedReference ?? input.resolvedIntent?.unresolvedReference ?? null,
    resolvedFrom: input.resolvedFrom ?? input.resolvedIntent?.resolvedFrom ?? null,
    resolvedEntity: input.resolvedEntity ?? input.resolvedIntent?.resolvedEntity ?? null,
    intakeType: input.intakeType ?? input.resolvedIntent?.intakeType ?? null,
    documentType: input.documentType ?? input.resolvedIntent?.documentType ?? null,
    fileName: input.fileName ?? input.resolvedIntent?.fileName ?? null,
    fileMimeType: input.fileMimeType ?? input.resolvedIntent?.fileMimeType ?? null,
    extractedEntityTypes: input.extractedEntityTypes ?? input.resolvedIntent?.extractedEntityTypes ?? [],
    suggestedActions: input.suggestedActions ?? input.resolvedIntent?.suggestedActions ?? [],
    extractionStatus: input.extractionStatus ?? input.resolvedIntent?.extractionStatus ?? null,
    externalSendIntent: input.externalSendIntent ?? input.resolvedIntent?.externalSendIntent ?? false,
    externalSendBlockedReason:
      input.externalSendBlockedReason ?? input.resolvedIntent?.externalSendBlockedReason ?? null,
    requiresConfirmation: input.requiresConfirmation ?? input.resolvedIntent?.requiresConfirmation ?? false,
    ...input,
  }
}

function buildExecutionFailure(
  message: string,
  action?: OperationsResolvedIntent["intent"],
  executionStatus: OperationsEngineResult["executionStatus"] = "failed",
  resolvedIntent?: OperationsResolvedIntent,
): OperationsEngineResult {
  return {
    ok: false,
    executionStatus,
    action,
    message,
    error: message,
    resolvedIntent,
    area: resolvedIntent?.area ?? null,
    entityType: resolvedIntent?.entityType ?? null,
    actionType: resolvedIntent?.actionType ?? null,
    targetReference: resolvedIntent?.targetReference ?? null,
    clarificationQuestion: resolvedIntent?.clarificationQuestion ?? null,
    unsupportedReason: resolvedIntent?.unsupportedReason ?? null,
    unresolvedReference: resolvedIntent?.unresolvedReference ?? null,
    resolvedFrom: resolvedIntent?.resolvedFrom ?? null,
    resolvedEntity: resolvedIntent?.resolvedEntity ?? null,
    intakeType: resolvedIntent?.intakeType ?? null,
    documentType: resolvedIntent?.documentType ?? null,
    fileName: resolvedIntent?.fileName ?? null,
    fileMimeType: resolvedIntent?.fileMimeType ?? null,
    extractedEntityTypes: resolvedIntent?.extractedEntityTypes ?? [],
    suggestedActions: resolvedIntent?.suggestedActions ?? [],
    extractionStatus: resolvedIntent?.extractionStatus ?? null,
    externalSendIntent: resolvedIntent?.externalSendIntent ?? false,
    externalSendBlockedReason: resolvedIntent?.externalSendBlockedReason ?? null,
    requiresConfirmation: resolvedIntent?.requiresConfirmation ?? false,
    entities: resolvedIntent?.entities,
  }
}

function humanizeEntityLabel(entityType: string | null | undefined) {
  switch (entityType) {
    case "expense":
      return "gasto"
    case "income":
      return "ganho"
    case "ticket":
      return "chamado"
    case "project":
      return "projeto"
    case "document":
      return "documento"
    case "meeting":
      return "reuniao"
    case "lead":
      return "lead"
    case "product":
      return "produto"
    case "service":
      return "servico"
    default:
      return "item"
  }
}

function buildContextualReadMessage(resolvedIntent: OperationsResolvedIntent) {
  const resolvedEntity = resolvedIntent.resolvedEntity
  const readField = resolvedIntent.readFields?.[0]

  if (!resolvedEntity) {
    return null
  }

  const entityLabel = humanizeEntityLabel(resolvedEntity.entityType)
  const fields = resolvedEntity.fields
  const amount = fields.amount ?? resolvedIntent.entities.amount

  if (readField === "latest") {
    return `O ultimo ${entityLabel} que voce trouxe nesta conversa foi ${resolvedEntity.name}.`
  }

  if (readField === "amount" && amount) {
    const numericAmount =
      typeof amount === "number"
        ? amount
        : Number(String(amount).replace(/\./g, "").replace(",", "."))

    return Number.isFinite(numericAmount)
      ? `O valor desse ${entityLabel} e ${formatCurrencyBRL(numericAmount)}.`
      : `O valor desse ${entityLabel} esta registrado como ${amount}.`
  }

  if (readField === "phone" && (fields.phone ?? resolvedIntent.entities.phone)) {
    return `O telefone desse ${entityLabel} e ${fields.phone ?? resolvedIntent.entities.phone}.`
  }

  if (readField === "email" && (fields.email ?? resolvedIntent.entities.email)) {
    return `O email desse ${entityLabel} e ${fields.email ?? resolvedIntent.entities.email}.`
  }

  if (readField === "priority" && (fields.priority ?? resolvedIntent.entities.priority)) {
    return `A prioridade desse ${entityLabel} esta como ${fields.priority ?? resolvedIntent.entities.priority}.`
  }

  if (readField === "status" && (fields.status ?? resolvedIntent.entities.status)) {
    return `O status desse ${entityLabel} esta como ${fields.status ?? resolvedIntent.entities.status}.`
  }

  if (readField === "notes" && (fields.notes ?? resolvedIntent.entities.notes)) {
    return `A observacao desse ${entityLabel} e: ${fields.notes ?? resolvedIntent.entities.notes}.`
  }

  if (readField === "responsible" && (fields.responsible ?? resolvedIntent.entities.responsible)) {
    return `O responsavel desse ${entityLabel} e ${fields.responsible ?? resolvedIntent.entities.responsible}.`
  }

  if (readField === "openedBy") {
    return "Esse chamado foi aberto por voce."
  }

  return `O item em foco nesta conversa e ${resolvedEntity.name}.`
}

function buildContextualUnsupportedUpdateMessage(resolvedIntent: OperationsResolvedIntent) {
  const resolvedEntity = resolvedIntent.resolvedEntity
  const entityLabel = humanizeEntityLabel(resolvedIntent.entityType ?? resolvedEntity?.entityType ?? null)

  return (
    resolvedIntent.unsupportedReason ||
    `Entendi que voce quer atualizar esse ${entityLabel}, mas essa execucao ainda nao esta conectada. Posso fazer isso assim que essa acao estiver conectada ao modulo correspondente.`
  )
}

export async function executeResolvedIntent(input: {
  message: string
  resolvedIntent: OperationsResolvedIntent
}): Promise<OperationsEngineResult> {
  const { message, resolvedIntent } = input

  switch (resolvedIntent.intent) {
    case "create_client": {
      const name = String(resolvedIntent.entities.name || "").trim()
      const email = String(resolvedIntent.entities.email || "").trim()
      const phone = String(resolvedIntent.entities.phone || "").trim()
      const result = await createClientAction({
        name,
        email,
        phone,
        company: "",
        notes: "",
        status: "active",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar o cliente agora. Tente novamente em instantes.", "create_client", "failed", resolvedIntent)
      }

      return buildExecutionSuccess({
        action: "create_client",
        resultId: result.clientId,
        message: `Cliente ${name} criado com sucesso.`,
        suggestedLabel: "Ver clientes no Portal",
        suggestedHref: "/portal/cadastros",
        resolvedIntent,
        targetType: "client",
        targetId: result.clientId,
        targetName: name,
        entities: {
          ...resolvedIntent.entities,
          name,
          email,
          phone,
        },
      })
    }

    case "update_client": {
      const directClientId = String(resolvedIntent.entities.clientId || "").trim()
      const directClientName = String(resolvedIntent.entities.clientName || "").trim()
      const nextName = String(resolvedIntent.entities.name || "").trim()
      const nextEmail = String(resolvedIntent.entities.email || "").trim()
      const nextPhone = String(resolvedIntent.entities.phone || "").trim()
      const nextCompany = String(resolvedIntent.entities.company || "").trim()
      const nextNotes = String(resolvedIntent.entities.notes || "").trim()
      const updatedFields = [
        ...(nextName ? ["name"] : []),
        ...(nextEmail ? ["email"] : []),
        ...(nextPhone ? ["phone"] : []),
        ...(nextCompany ? ["company"] : []),
        ...(nextNotes ? ["notes"] : []),
      ]

      let targetClient: ResolvedClientRecord | null = null

      if (directClientId) {
        const clientResult = await getClientByIdAction({ clientId: directClientId })
        if (clientResult.error || !clientResult.client) {
          return buildExecutionFailure(
            clientResult.error || "Nao encontrei esse cliente para atualizar.",
            "update_client",
            "validation_failed",
            resolvedIntent,
          )
        }

        targetClient = clientResult.client
      } else if (directClientName) {
        const clientResolution = await resolveClientByName(directClientName)
        if ("error" in clientResolution) {
          return buildExecutionFailure(
            clientResolution.error || "Nao encontrei esse cliente para atualizar.",
            "update_client",
            "validation_failed",
            resolvedIntent,
          )
        }

        targetClient = clientResolution.client
      }

      if (!targetClient) {
        return buildExecutionFailure("Qual cliente voce quer atualizar?", "update_client", "validation_failed", resolvedIntent)
      }

      const result = await updateClientAction({
        clientId: targetClient.id,
        name: nextName || targetClient.name,
        email: nextEmail || targetClient.email,
        phone: nextPhone || targetClient.phone,
        company: nextCompany || targetClient.company,
        notes: nextNotes || targetClient.notes,
        status: targetClient.status,
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui atualizar o cliente agora. Tente novamente em instantes.", "update_client", "failed", resolvedIntent)
      }

      const currentTargetName = targetClient.name
      const finalTargetName = nextName || result.clientName || currentTargetName
      const updateMessage =
        updatedFields.length === 1 && updatedFields[0] === "phone"
          ? `Telefone do cliente ${finalTargetName} atualizado com sucesso.`
          : updatedFields.length === 1 && updatedFields[0] === "email"
            ? `E-mail do cliente ${finalTargetName} atualizado com sucesso.`
            : updatedFields.length === 1 && updatedFields[0] === "name"
              ? `Nome do cliente ${currentTargetName} atualizado para ${finalTargetName}.`
              : updatedFields.length === 1 && updatedFields[0] === "company"
                ? `Empresa do cliente ${finalTargetName} atualizada com sucesso.`
                : updatedFields.length === 1 && updatedFields[0] === "notes"
                  ? `Observacoes do cliente ${finalTargetName} atualizadas com sucesso.`
                  : `Dados do cliente ${finalTargetName} atualizados com sucesso.`

      return buildExecutionSuccess({
        action: "update_client",
        resultId: result.clientId || targetClient.id,
        message: updateMessage,
        suggestedLabel: "Ver clientes no Portal",
        suggestedHref: "/portal/cadastros",
        resolvedIntent,
        targetType: "client",
        targetId: result.clientId || targetClient.id,
        targetName: finalTargetName,
        updatedFields,
        entities: {
          ...resolvedIntent.entities,
          clientId: result.clientId || targetClient.id,
          clientName: finalTargetName,
          name: nextName || null,
          email: nextEmail || targetClient.email,
          phone: nextPhone || targetClient.phone,
          company: nextCompany || targetClient.company,
          notes: nextNotes || targetClient.notes,
        },
      })
    }

    case "create_financial_income":
    case "create_financial_expense": {
      const amount = String(resolvedIntent.entities.amount || "").trim()
      const rawTitle = String(resolvedIntent.entities.title || "").trim()
      const title = rawTitle ? toTitleCase(rawTitle) : ""
      const isIncome = resolvedIntent.intent === "create_financial_income"
      const result = await createFinancialEntryAction({
        type: isIncome ? "income" : "expense",
        title,
        amount,
        category: title,
        dueDate: "",
        notes: message,
      })

      if (result.error) {
        return buildExecutionFailure(
          "Nao consegui registrar o lancamento agora. Tente novamente em instantes.",
          resolvedIntent.intent,
          "failed",
          resolvedIntent,
        )
      }

      return buildExecutionSuccess({
        action: resolvedIntent.intent,
        resultId: result.entryId,
        message: `${isIncome ? "Lancei o ganho" : "Lancei o gasto"} de ${formatCurrencyBRL(Number(amount.replace(/\./g, "").replace(",", ".")))} em ${title}.`,
        suggestedLabel: "Ver financeiro no Portal",
        suggestedHref: "/portal/financeiro",
        resolvedIntent,
        targetId: result.entryId,
        targetName: title,
        area: "financeiro",
        entityType: isIncome ? "income" : "expense",
        actionType: "create",
        entities: {
          ...resolvedIntent.entities,
          amount,
          title,
          openedBy: "voce",
        },
      })
    }

    case "create_operation": {
      const title = String(resolvedIntent.entities.title || "").trim()
      const clientName = String(resolvedIntent.entities.clientName || "").trim()
      const isTripRequest = /\bviagem\b/.test(normalizeEngineText(message))

      let clientId: string | undefined
      let resolvedClientName = ""

      if (clientName) {
        const clientResolution = await resolveClientByName(clientName)
        if ("error" in clientResolution) {
          return buildExecutionFailure(
            isTripRequest
              ? `Nao encontrei um cliente chamado ${clientName}. Voce quer cadastrar esse cliente primeiro ou selecionar outro cliente?`
              : clientResolution.error || "Nao consegui localizar este cliente agora.",
            "create_operation",
            "validation_failed",
          )
        }

        clientId = clientResolution.client.id
        resolvedClientName = clientResolution.client.name || clientName
      }

      if (isTripRequest) {
        const result = await createTripAction({
          clientId,
          title,
          destination: "",
          startDate: "",
          endDate: "",
          travelerCount: "1",
          status: "draft",
          notes: message,
        })

        if (result.error) {
          return buildExecutionFailure("Nao consegui criar a viagem agora. Tente novamente em instantes.", "create_operation", "failed", resolvedIntent)
        }

        return buildExecutionSuccess({
          action: "create_operation",
          resultId: result.tripId,
          message: resolvedClientName
            ? `Viagem ${title} criada com sucesso para ${resolvedClientName}.`
            : `Viagem ${title} criada com sucesso.`,
          suggestedLabel: "Ver viagens no Portal",
          suggestedHref: "/portal/viagens",
          resolvedIntent,
          targetId: result.tripId,
          targetName: title,
          area: "operacoes",
          entityType: "project",
          actionType: "create",
          entities: {
            ...resolvedIntent.entities,
            title,
            clientName: resolvedClientName || clientName || null,
          },
        })
      }

      const result = await createOperationAction({
        clientId,
        title,
        description: message,
        status: "open",
        priority: "medium",
        dueDate: "",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar a operacao agora. Tente novamente em instantes.", "create_operation", "failed", resolvedIntent)
      }

      return buildExecutionSuccess({
        action: "create_operation",
        resultId: result.operationId,
        message: resolvedClientName
          ? `Operacao ${title} criada com sucesso para ${resolvedClientName}.`
          : `Operacao ${title} criada com sucesso.`,
        suggestedLabel: "Ver operacoes no Portal",
        suggestedHref: "/portal/operacoes",
        resolvedIntent,
        targetId: result.operationId,
        targetName: title,
        area: "operacoes",
        entityType: "project",
        actionType: "create",
        entities: {
          ...resolvedIntent.entities,
          title,
          responsible: resolvedIntent.entities.responsible ?? null,
          priority: resolvedIntent.entities.priority ?? "medium",
        },
      })
    }

    case "create_document": {
      const title = String(resolvedIntent.entities.title || "").trim()
      const type = String(resolvedIntent.entities.type || "outro").trim()
      const clientName = String(resolvedIntent.entities.clientName || "").trim()

      if (type.toLowerCase() === "contrato") {
        let clientId: string | undefined
        let resolvedClientName = ""

        if (clientName) {
          const clientResolution = await resolveClientByName(clientName)
          if ("error" in clientResolution) {
            return buildExecutionFailure(
              `Nao encontrei um cliente chamado ${clientName}. Voce quer cadastrar esse cliente primeiro ou selecionar outro cliente?`,
              "create_document",
              "validation_failed",
              resolvedIntent,
            )
          }

          clientId = clientResolution.client.id
          resolvedClientName = clientResolution.client.name || clientName
        }

        const result = await createContractAction({
          clientId,
          title,
          status: "draft",
          fileUrl: "",
          notes: message,
        })

        if (result.error) {
          return buildExecutionFailure("Nao consegui criar o contrato agora. Tente novamente em instantes.", "create_document", "failed", resolvedIntent)
        }

        return buildExecutionSuccess({
          action: "create_document",
          resultId: result.contractId,
          message: resolvedClientName
            ? `Contrato ${title} criado com sucesso para ${resolvedClientName}.`
            : `Contrato ${title} criado com sucesso.`,
          suggestedLabel: "Ver contratos no Portal",
          suggestedHref: "/portal/operacoes",
          resolvedIntent,
          targetId: result.contractId,
          targetName: title,
          area: "documentos",
          entityType: "document",
          actionType: "create",
          entities: {
            ...resolvedIntent.entities,
            title,
            type,
            clientName: resolvedClientName || clientName || null,
          },
        })
      }

      const result = await createDocumentAction({
        title,
        type,
        fileUrl: "",
        content: message,
        status: "draft",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar o documento agora. Tente novamente em instantes.", "create_document", "failed", resolvedIntent)
      }

      return buildExecutionSuccess({
        action: "create_document",
        resultId: result.documentId,
        message: `Documento ${title} criado com sucesso.`,
        suggestedLabel: "Ver documentos no Portal",
        suggestedHref: "/portal/documentos",
        resolvedIntent,
        targetId: result.documentId,
        targetName: title,
        area: "documentos",
        entityType: "document",
        actionType: "create",
        entities: {
          ...resolvedIntent.entities,
          title,
          type,
        },
      })
    }

    case "create_meeting": {
      const title = String(resolvedIntent.entities.title || "").trim()
      const result = await createMeetingAction({
        title,
        summary: `Solicitacao enviada pelo chat: ${message}`,
        status: "draft",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui criar a reuniao agora. Tente novamente em instantes.", "create_meeting", "failed", resolvedIntent)
      }

      return buildExecutionSuccess({
        action: "create_meeting",
        resultId: result.meetingId,
        message: `Criei a reuniao ${title} como rascunho.`,
        suggestedLabel: "Ver reunioes",
        suggestedHref: "/app/conversas/reunioes",
        resolvedIntent,
        targetId: result.meetingId,
        targetName: title,
        area: "reunioes",
        entityType: "meeting",
        actionType: "create",
        entities: {
          ...resolvedIntent.entities,
          title,
          notes: resolvedIntent.entities.notes ?? `Solicitacao enviada pelo chat: ${message}`,
        },
      })
    }

    case "create_support_ticket": {
      const category = String(resolvedIntent.entities.category || "Duvida sobre o COS")
      const subject = String(resolvedIntent.entities.subject || "Solicitacao de suporte").trim()
      const result = await createSupportTicketAction({
        category,
        subject: subject || "Solicitacao de suporte",
        description: message,
        priority: "Media",
      })

      if (result.error) {
        return buildExecutionFailure("Nao consegui abrir o chamado agora. Tente novamente em instantes.", "create_support_ticket", "failed", resolvedIntent)
      }

      return buildExecutionSuccess({
        action: "create_support_ticket",
        resultId: result.ticketId,
        message: "Chamado de suporte criado com sucesso.",
        suggestedLabel: "Abrir suporte",
        suggestedHref: "/app/conversas/suporte",
        resolvedIntent,
        targetId: result.ticketId,
        targetName: subject || "Solicitacao de suporte",
        area: "suporte",
        entityType: "ticket",
        actionType: "open",
        entities: {
          ...resolvedIntent.entities,
          subject,
          category,
          priority: "high" === String(resolvedIntent.entities.priority || "").trim().toLowerCase() ? "high" : "medium",
          openedBy: "voce",
          status: "open",
        },
      })
    }

    case "get_clients_count": {
      const result = await getClientsAction()
      if (result.error) {
        return buildExecutionFailure("Nao consegui consultar seus clientes agora.", "get_clients_count", "failed", resolvedIntent)
      }

      const clientsCount = (result.clients ?? []).filter((client) => client.status !== "archived").length
      return buildExecutionSuccess({
        action: "get_clients_count",
        message: `Voce tem ${clientsCount} cliente${clientsCount === 1 ? "" : "s"} cadastrado${clientsCount === 1 ? "" : "s"}.`,
        resolvedIntent,
        entities: resolvedIntent.entities,
      })
    }

    case "get_financial_summary": {
      const result = await getFinancialSummaryAction()
      if (result.error || !result.summary) {
        return buildExecutionFailure("Nao consegui consultar seu resumo financeiro agora.", "get_financial_summary", "failed", resolvedIntent)
      }

      return buildExecutionSuccess({
        action: "get_financial_summary",
        message: `Seu saldo atual e ${formatCurrencyBRL(result.summary.balance)}.`,
        suggestedLabel: "Ver financeiro no Portal",
        suggestedHref: "/portal/financeiro",
        resolvedIntent,
        entities: resolvedIntent.entities,
      })
    }

    case "get_recent_activity": {
      const result = await getWorkspaceActivityLogsAction()
      if (result.error) {
        return buildExecutionFailure("Nao consegui consultar as ultimas atividades agora.", "get_recent_activity", "failed", resolvedIntent)
      }

      const recentLogs = (result.logs ?? []).slice(0, 3)
      if (recentLogs.length === 0) {
        return buildExecutionSuccess({
          action: "get_recent_activity",
          message: "Ainda nao ha atividades registradas no seu workspace.",
          suggestedLabel: "Abrir historico",
          suggestedHref: "/app/historico",
          resolvedIntent,
          entities: resolvedIntent.entities,
        })
      }

      const summary = recentLogs.map((log) => humanizeActivityAction(log.action)).join(", ")
      return buildExecutionSuccess({
        action: "get_recent_activity",
        message: `Suas ultimas atividades foram: ${summary}.`,
        suggestedLabel: "Abrir historico",
        suggestedHref: "/app/historico",
        resolvedIntent,
        entities: resolvedIntent.entities,
      })
    }

    case "unknown":
    default:
      if (resolvedIntent.actionType === "read" && resolvedIntent.resolvedEntity) {
        return buildExecutionSuccess({
          action: "unknown",
          message:
            buildContextualReadMessage(resolvedIntent) ||
            "Nao consegui ler esse contexto com seguranca agora.",
          resolvedIntent,
          targetType: resolvedIntent.resolvedEntity.entityType === "client" ? "client" : null,
          targetId: resolvedIntent.resolvedEntity.id ?? undefined,
          targetName: resolvedIntent.resolvedEntity.name,
          readFields: resolvedIntent.readFields ?? [],
          resolvedFrom: resolvedIntent.resolvedFrom ?? null,
          resolvedEntity: resolvedIntent.resolvedEntity,
          entities: {
            ...resolvedIntent.resolvedEntity.fields,
            ...resolvedIntent.entities,
          },
        })
      }

      if (resolvedIntent.actionType === "update" && resolvedIntent.resolvedEntity) {
        return buildExecutionFailure(
          buildContextualUnsupportedUpdateMessage(resolvedIntent),
          "unknown",
          "not_executed",
          resolvedIntent,
        )
      }

      return buildExecutionFailure(
        "Ainda nao consigo executar essa solicitacao, mas posso ajudar com clientes, financeiro, operacoes, documentos, reunioes e suporte.",
        "unknown",
        "not_executed",
        resolvedIntent,
      )
  }
}
