import type { DetectedIntent, OperationsConversationMemory, OperationsEngineContext } from "@/lib/cos-engine/types"
import { resolveIntentReferences } from "@/lib/cos-engine/reference-resolution"
import {
  detectDocumentType,
  detectSupportCategory,
  extractClientUpdateEntities,
  extractClientName,
  extractDocumentTitle,
  extractEmail,
  extractFinancialTitle,
  extractMeetingTitle,
  extractMoneyValue,
  extractOperationClientName,
  extractOperationTitle,
  extractPhone,
  inferOperationalEntitiesFromMessage,
  inferQuickActionFromMessage,
  extractSupportSubject,
  inferFinancialType,
  isClientsCountQuery,
  isFinancialSummaryQuery,
  isRecentActivityQuery,
  looksLikeCreateClient,
  looksLikeCreateDocument,
  looksLikeCreateFinancial,
  looksLikeCreateMeeting,
  looksLikeCreateOperation,
  looksLikeCreateSupportTicket,
  looksLikeContextualRead,
  looksLikeContextualUpdate,
  looksLikeExternalSend,
  looksLikeFileIntake,
  looksLikeUpdateClient,
} from "@/lib/cos-engine/operations-tools"

export function detectOperationsIntent(
  message: string,
  context: OperationsEngineContext,
  conversationMemory?: OperationsConversationMemory,
  attachment?: { fileName?: string | null; fileMimeType?: string | null },
): DetectedIntent {
  if (isClientsCountQuery(message)) {
    return {
      intent: "get_clients_count",
      entities: {},
      area: "cadastros",
      entityType: "client",
      actionType: "count",
    }
  }

  if (isFinancialSummaryQuery(message)) {
    return {
      intent: "get_financial_summary",
      entities: {},
      area: "financeiro",
      entityType: "cash_flow",
      actionType: "summarize",
    }
  }

  if (isRecentActivityQuery(message)) {
    return {
      intent: "get_recent_activity",
      entities: {},
      area: "sistema",
      entityType: "system_log",
      actionType: "summarize",
    }
  }

  if (looksLikeCreateClient(message, context)) {
    return {
      intent: "create_client",
      entities: {
        name: extractClientName(message, context),
        email: extractEmail(message),
        phone: extractPhone(message),
      },
      area: "cadastros",
      entityType: "client",
      actionType: "create",
    }
  }

  if (looksLikeUpdateClient(message, context)) {
    const detected = {
      intent: "update_client" as const,
      entities: extractClientUpdateEntities(message),
    }

    const resolved = resolveIntentReferences({
      resolvedIntent: {
        intent: detected.intent,
        confidence: 1,
        entities: detected.entities,
        requiresConfirmation: false,
        missingFields: [],
        unsafeReason: null,
        reply: "Vou atualizar esse cliente para voce.",
        shouldFallbackToHeuristic: false,
        source: "heuristic",
      },
      message,
      conversationMemory,
    })

    return {
      intent: "update_client",
      entities: resolved.entities,
      area: "cadastros",
      entityType: "client",
      actionType: "update",
      unresolvedReference: resolved.unresolvedReference ?? null,
    }
  }

  if (looksLikeCreateFinancial(message, context)) {
    const type = inferFinancialType(message, context)
    return {
      intent: type === "income" ? "create_financial_income" : "create_financial_expense",
      entities: {
        amount: extractMoneyValue(message),
        title: extractFinancialTitle(message),
      },
      area: "financeiro",
      entityType: type === "income" ? "income" : "expense",
      actionType: "create",
    }
  }

  if (looksLikeCreateOperation(message, context)) {
    return {
      intent: "create_operation",
      entities: {
        title: extractOperationTitle(message, context),
        clientName: extractOperationClientName(message),
      },
      area: "operacoes",
      entityType: "project",
      actionType: "create",
    }
  }

  if (looksLikeCreateDocument(message, context)) {
    return {
      intent: "create_document",
      entities: {
        title: extractDocumentTitle(message, context),
        type: detectDocumentType(message),
        clientName: extractOperationClientName(message),
      },
      area: "documentos",
      entityType: "document",
      actionType: "create",
    }
  }

  if (looksLikeCreateMeeting(message, context)) {
    return {
      intent: "create_meeting",
      entities: {
        title: extractMeetingTitle(message, context),
      },
      area: "reunioes",
      entityType: "meeting",
      actionType: "create",
    }
  }

  if (looksLikeCreateSupportTicket(message, context)) {
    return {
      intent: "create_support_ticket",
      entities: {
        category: detectSupportCategory(message, context),
        subject: extractSupportSubject(message),
      },
      area: "suporte",
      entityType: "ticket",
      actionType: "open",
    }
  }

  const operationalFallback = inferOperationalEntitiesFromMessage(message, context, attachment)
  const quickAction = inferQuickActionFromMessage(message)

  if (looksLikeContextualUpdate(message) || looksLikeContextualRead(message)) {
    return {
      intent: "unknown",
      entities: operationalFallback.entities,
      area: operationalFallback.area,
      entityType: operationalFallback.entityType ?? conversationMemory?.lastEntityType ?? null,
      actionType: looksLikeContextualRead(message) ? "read" : "update",
      targetReference: operationalFallback.unresolvedReference ? null : "contextual_reference",
      clarificationQuestion: operationalFallback.clarificationQuestion,
      unsupportedReason: operationalFallback.unsupportedReason,
      unresolvedReference: operationalFallback.unresolvedReference,
      resolvedFrom: null,
      resolvedEntity: null,
      readFields: looksLikeContextualRead(message) ? ["contextual"] : [],
      intakeType: operationalFallback.intakeType,
      documentType: operationalFallback.documentType,
      extractedEntityTypes: operationalFallback.extractedEntityTypes,
      suggestedActions: operationalFallback.suggestedActions,
      extractionStatus: operationalFallback.extractionStatus,
      externalSendIntent: operationalFallback.externalSendIntent,
      externalSendBlockedReason: operationalFallback.externalSendBlockedReason,
    }
  }

  if (looksLikeFileIntake(message) || looksLikeExternalSend(message) || quickAction) {
    return {
      intent: "unknown",
      entities: operationalFallback.entities,
      area: quickAction?.entityType === "ticket" ? "suporte" : operationalFallback.area,
      entityType: quickAction?.entityType ?? operationalFallback.entityType,
      actionType: quickAction?.actionType ?? operationalFallback.actionType,
      targetReference: null,
      clarificationQuestion: operationalFallback.clarificationQuestion,
      unsupportedReason:
        quickAction?.status === "unsupported_external_action"
          ? `Entendi a acao ${quickAction.label}, mas essa execucao ainda nao esta conectada.`
          : operationalFallback.unsupportedReason,
      unresolvedReference: operationalFallback.unresolvedReference,
      resolvedFrom: null,
      resolvedEntity: null,
      intakeType: operationalFallback.intakeType,
      documentType: operationalFallback.documentType,
      extractedEntityTypes: operationalFallback.extractedEntityTypes,
      suggestedActions: operationalFallback.suggestedActions,
      extractionStatus: operationalFallback.extractionStatus,
      externalSendIntent: operationalFallback.externalSendIntent,
      externalSendBlockedReason: operationalFallback.externalSendBlockedReason,
    }
  }

  return {
    intent: "unknown",
    entities: operationalFallback.entities,
    area: operationalFallback.area,
    entityType: operationalFallback.entityType,
    actionType: operationalFallback.actionType,
    targetReference: null,
    clarificationQuestion: operationalFallback.clarificationQuestion,
    unsupportedReason: operationalFallback.unsupportedReason,
    unresolvedReference: operationalFallback.unresolvedReference,
    resolvedFrom: null,
    resolvedEntity: null,
    intakeType: operationalFallback.intakeType,
    documentType: operationalFallback.documentType,
    extractedEntityTypes: operationalFallback.extractedEntityTypes,
    suggestedActions: operationalFallback.suggestedActions,
    extractionStatus: operationalFallback.extractionStatus,
    externalSendIntent: operationalFallback.externalSendIntent,
    externalSendBlockedReason: operationalFallback.externalSendBlockedReason,
    readFields: [],
  }
}

