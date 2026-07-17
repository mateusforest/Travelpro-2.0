import { futureMinimumIntentConfidence, getRequiredFieldsForIntent } from "@/lib/cos-engine/schemas"
import {
  buildOperationalClarificationQuestion,
  buildOperationalMissingFields,
  buildOperationalUnsupportedReply,
} from "@/lib/cos-engine/operational-model"
import {
  classifyUnsupportedOperationsRequest,
  normalizeEngineText,
  recoverClientNameFromMessage,
} from "@/lib/cos-engine/operations-tools"
import { resolveIntentReferences } from "@/lib/cos-engine/reference-resolution"
import type {
  OperationsResolvedIntent,
  ValidateIntentPayloadInput,
  ValidateIntentPayloadResult,
} from "@/lib/cos-engine/types"

function hasMeaningfulValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value)
  }

  if (typeof value === "boolean") {
    return true
  }

  return typeof value === "string" ? value.trim().length > 0 : false
}

function parseAmount(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value !== "string") {
    return Number.NaN
  }

  const normalized = value.replace(/\./g, "").replace(",", ".").trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function buildFinancialAmountQuestion(resolvedIntent: OperationsResolvedIntent) {
  const subject = String(resolvedIntent.entities.title || resolvedIntent.entities.description || "")
    .trim()
    .toLowerCase()

  if (resolvedIntent.intent === "create_financial_income") {
    return subject ? `Qual foi o valor da receita com ${subject}?` : "Qual foi o valor da receita?"
  }

  return subject ? `Qual foi o valor do gasto com ${subject}?` : "Qual foi o valor do gasto?"
}

function buildMissingFieldMessage(
  intent: OperationsResolvedIntent["intent"],
  missingFields: string[],
  entities?: OperationsResolvedIntent["entities"],
) {
  if (intent === "create_client" && missingFields.includes("name")) {
    return "Qual e o nome do cliente?"
  }

  if (intent === "update_client" && missingFields.includes("client")) {
    return "Qual cliente voce quer atualizar?"
  }

  if (intent === "update_client" && missingFields.includes("update_fields")) {
    return "O que voce quer atualizar nesse cliente?"
  }

  if ((intent === "create_financial_income" || intent === "create_financial_expense") && missingFields.includes("amount")) {
    return buildFinancialAmountQuestion({
      intent,
      confidence: 1,
      entities: entities ?? {},
      requiresConfirmation: false,
      missingFields,
      unsafeReason: null,
      reply: "",
      shouldFallbackToHeuristic: false,
      source: "heuristic",
    })
  }

  if ((intent === "create_financial_income" || intent === "create_financial_expense") && missingFields.includes("title")) {
    return intent === "create_financial_income"
      ? "Qual e a descricao desse recebimento?"
      : "Qual e a descricao dessa despesa?"
  }

  if (intent === "create_operation" && missingFields.includes("title")) {
    return "Qual sera o titulo da viagem?"
  }

  if (intent === "create_document" && missingFields.includes("title")) {
    return entities?.type === "contrato" ? "Qual sera o titulo do contrato?" : "Qual sera o titulo do documento?"
  }

  if (intent === "create_meeting" && missingFields.includes("title")) {
    return "Qual sera o titulo da reuniao?"
  }

  if (intent === "create_support_ticket" && missingFields.includes("subject")) {
    return "Qual e o assunto do chamado?"
  }

  if (intent === "create_support_ticket" && missingFields.includes("description")) {
    return "Pode me descrever o problema para eu abrir o chamado?"
  }

  if (missingFields.includes("file")) {
    return "Envie o arquivo, documento ou foto para eu preparar a analise."
  }

  return "Preciso de mais informacoes para executar essa solicitacao."
}

function isRecoverableClientNameUnsafeReason(unsafeReason: string | null | undefined) {
  const normalized = normalizeEngineText(unsafeReason || "")

  if (!normalized) {
    return false
  }

  return [
    "special character",
    "encoding",
    "question mark",
    "accent",
    "acento",
    "typo",
    "caractere especial",
  ].some((term) => normalized.includes(normalizeEngineText(term)))
}

function recoverClientIntentIfSafe({
  resolvedIntent,
  message,
}: {
  resolvedIntent: OperationsResolvedIntent
  message: string
}) {
  if (resolvedIntent.intent !== "create_client" || resolvedIntent.confidence < 0.75) {
    return resolvedIntent
  }

  const recoveredName = recoverClientNameFromMessage(message)
  if (!recoveredName) {
    return resolvedIntent
  }

  const currentName = String(resolvedIntent.entities.name || "").trim()
  const nameLooksBroken = !currentName || currentName.includes("?")
  const unsafeReasonIsRecoverable = isRecoverableClientNameUnsafeReason(resolvedIntent.unsafeReason)

  if (!nameLooksBroken && !unsafeReasonIsRecoverable && !resolvedIntent.missingFields.includes("name")) {
    return resolvedIntent
  }

  return {
    ...resolvedIntent,
    entities: {
      ...resolvedIntent.entities,
      name: recoveredName,
    },
    missingFields: resolvedIntent.missingFields.filter((field) => field !== "name"),
    unsafeReason: unsafeReasonIsRecoverable ? null : resolvedIntent.unsafeReason,
  }
}

export function validateIntentPayload({
  resolvedIntent,
  message,
  conversationMemory,
}: ValidateIntentPayloadInput): ValidateIntentPayloadResult {
  const normalizedResolvedIntent: OperationsResolvedIntent = resolveIntentReferences({
    resolvedIntent: recoverClientIntentIfSafe({
      resolvedIntent,
      message,
    }),
    message,
    conversationMemory,
  })
  const unsupportedRequest = classifyUnsupportedOperationsRequest(message)

  if (
    unsupportedRequest &&
    normalizedResolvedIntent.intent !== "update_client" &&
    !(normalizedResolvedIntent.intent === "unknown" && normalizedResolvedIntent.entityType && normalizedResolvedIntent.actionType)
  ) {
    return {
      ok: false,
      resolvedIntent: {
        ...normalizedResolvedIntent,
        unsafeReason: unsupportedRequest.kind,
      },
      message: unsupportedRequest.message,
      executionStatus: "not_executed",
    }
  }

  if (normalizedResolvedIntent.intent === "unknown") {
    if (normalizedResolvedIntent.unresolvedReference === "ambiguous_reference" || normalizedResolvedIntent.unresolvedReference === "missing_reference_target") {
      return {
        ok: false,
        resolvedIntent: normalizedResolvedIntent,
        message:
          normalizedResolvedIntent.clarificationQuestion ||
          "Qual item voce quer atualizar?",
        executionStatus: "validation_failed",
      }
    }

    if (normalizedResolvedIntent.externalSendIntent && normalizedResolvedIntent.externalSendBlockedReason) {
      return {
        ok: false,
        resolvedIntent: normalizedResolvedIntent,
        message:
          "Entendi que voce quer enviar este documento, mas o envio externo ainda nao esta conectado. Posso preparar a acao e indicar os dados necessarios.",
        executionStatus: "not_executed",
      }
    }

    const derivedMissingFields =
      normalizedResolvedIntent.missingFields.length > 0
        ? normalizedResolvedIntent.missingFields
        : buildOperationalMissingFields({
            entityType: normalizedResolvedIntent.entityType ?? null,
            actionType: normalizedResolvedIntent.actionType ?? null,
            entities: normalizedResolvedIntent.entities,
          })
    const intakeMissingFields =
      normalizedResolvedIntent.extractionStatus === "awaiting_file" ||
      ((!normalizedResolvedIntent.intakeType || normalizedResolvedIntent.intakeType === "unknown") &&
        (normalizedResolvedIntent.documentType || normalizedResolvedIntent.suggestedActions?.length))
          ? ["file"]
          : []
    const mergedMissingFields = Array.from(new Set([...derivedMissingFields, ...intakeMissingFields]))
    const clarificationQuestion =
      normalizedResolvedIntent.clarificationQuestion ||
      buildOperationalClarificationQuestion({
        entityType: normalizedResolvedIntent.entityType ?? null,
        actionType: normalizedResolvedIntent.actionType ?? null,
        missingFields: mergedMissingFields,
      })
    const unsupportedReply =
      normalizedResolvedIntent.unsupportedReason ||
      buildOperationalUnsupportedReply({
        entityType: normalizedResolvedIntent.entityType ?? null,
        actionType: normalizedResolvedIntent.actionType ?? null,
      })

    const hasResolvedEntity = Boolean(normalizedResolvedIntent.resolvedEntity)
    const canAnswerContextualRead = normalizedResolvedIntent.actionType === "read" && hasResolvedEntity
    const canProcessContextualUpdate = normalizedResolvedIntent.actionType === "update" && hasResolvedEntity
    const hasContextualUpdatePayload = [
      "name",
      "email",
      "phone",
      "company",
      "notes",
      "amount",
      "priority",
      "status",
      "responsible",
      "title",
    ].some((field) => hasMeaningfulValue(normalizedResolvedIntent.entities[field]))

    if (canAnswerContextualRead || canProcessContextualUpdate) {
      if (canProcessContextualUpdate && !hasContextualUpdatePayload) {
        return {
          ok: false,
          resolvedIntent: {
            ...normalizedResolvedIntent,
            missingFields: ["update_fields"],
            clarificationQuestion:
              clarificationQuestion ||
              `O que voce quer atualizar nesse ${normalizedResolvedIntent.resolvedEntity?.name || "item"}?`,
          },
          message:
            clarificationQuestion ||
            `O que voce quer atualizar nesse ${normalizedResolvedIntent.resolvedEntity?.name || "item"}?`,
          executionStatus: "validation_failed",
        }
      }

      return {
        ok: true,
        resolvedIntent: {
          ...normalizedResolvedIntent,
          missingFields: mergedMissingFields,
          clarificationQuestion: clarificationQuestion ?? null,
          unsupportedReason: unsupportedReply ?? normalizedResolvedIntent.unsupportedReason ?? null,
        },
      }
    }

    return {
      ok: false,
      resolvedIntent: {
        ...normalizedResolvedIntent,
        missingFields: mergedMissingFields,
        clarificationQuestion: clarificationQuestion ?? null,
        unsupportedReason: unsupportedReply ?? normalizedResolvedIntent.unsupportedReason ?? null,
      },
      message:
        clarificationQuestion ||
        unsupportedReply ||
        "Ainda nao consigo executar essa solicitacao, mas posso ajudar com clientes, financeiro, operacoes, documentos, reunioes e suporte.",
      executionStatus: "not_executed",
    }
  }

  if (normalizedResolvedIntent.source === "openai" && normalizedResolvedIntent.confidence < futureMinimumIntentConfidence) {
    return {
      ok: false,
      resolvedIntent: {
        ...normalizedResolvedIntent,
        unsafeReason: "low_confidence",
      },
      message: "Nao consegui interpretar essa solicitacao com seguranca. Pode reformular?",
      executionStatus: "validation_failed",
    }
  }

  if (normalizedResolvedIntent.unsafeReason) {
    return {
      ok: false,
      resolvedIntent: normalizedResolvedIntent,
      message: "Preciso de uma solicitacao mais clara antes de executar isso.",
      executionStatus: "validation_failed",
    }
  }

  const requiredFields = getRequiredFieldsForIntent(normalizedResolvedIntent.intent)
  const entities: OperationsResolvedIntent["entities"] = {
    ...normalizedResolvedIntent.entities,
    description: normalizedResolvedIntent.entities.description ?? message,
  }

  if (normalizedResolvedIntent.intent === "update_client") {
    const hasClientTarget = hasMeaningfulValue(entities.clientId) || hasMeaningfulValue(entities.clientName)
    const hasUpdateField = ["name", "email", "phone", "company", "notes"].some((field) => hasMeaningfulValue(entities[field]))

    const missingFields = [
      ...(!hasClientTarget ? ["client"] : []),
      ...(!hasUpdateField ? ["update_fields"] : []),
    ]

    if (missingFields.length > 0) {
      return {
        ok: false,
        resolvedIntent: {
          ...normalizedResolvedIntent,
          entities,
          missingFields,
        },
        message: buildMissingFieldMessage("update_client", missingFields, entities),
        executionStatus: "validation_failed",
      }
    }
  }

  const missingFields = requiredFields.filter((field) => !hasMeaningfulValue(entities[field]))
  if (missingFields.length > 0) {
    return {
      ok: false,
      resolvedIntent: {
        ...normalizedResolvedIntent,
        entities,
        missingFields,
      },
      message: buildMissingFieldMessage(normalizedResolvedIntent.intent, missingFields, entities),
      executionStatus: "validation_failed",
    }
  }

  if (
    normalizedResolvedIntent.intent === "create_financial_income" ||
    normalizedResolvedIntent.intent === "create_financial_expense"
  ) {
    const parsedAmount = parseAmount(entities.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return {
        ok: false,
        resolvedIntent: {
          ...normalizedResolvedIntent,
          entities,
          missingFields: ["amount"],
        },
        message: buildFinancialAmountQuestion({
          ...normalizedResolvedIntent,
          entities,
        }),
        executionStatus: "validation_failed",
      }
    }
  }

  return {
    ok: true,
    resolvedIntent: {
      ...normalizedResolvedIntent,
      entities,
      missingFields: [],
    },
  }
}
