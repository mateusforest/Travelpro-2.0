import {
  buildAmbiguousReferenceMessage,
  buildMissingReferenceMessage,
  inferReadFieldFromMessage,
  resolveConversationEntityReference,
} from "@/lib/cos-engine/entity-context"
import { extractEmail, extractPhone, normalizeEngineText, toTitleCase } from "@/lib/cos-engine/operations-tools"
import type { OperationsConversationMemory, OperationsResolvedIntent } from "@/lib/cos-engine/types"

function extractUpdatedClientName(message: string) {
  const match = message.match(/(?:mude|altere|atualize|troque)\s+o?\s*nome(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

function extractUpdatedCompany(message: string) {
  const match = message.match(/(?:empresa|companhia)(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? match[1].trim() : ""
}

function extractUpdatedNotes(message: string) {
  const quoteMatch = message.match(/(?:observacao|observação|nota).+?["']([^"']+)["']/iu)
  if (quoteMatch?.[1]) {
    return quoteMatch[1].trim()
  }

  const match = message.match(/(?:observacao|observação|nota)(?:\s+dele|\s+dela|\s+nesse item|\s+nesse gasto|\s+nesse chamado)?\s+(.+)$/iu)
  return match?.[1] ? match[1].trim() : ""
}

function extractPriorityValue(message: string) {
  const normalized = normalizeEngineText(message)
  if (normalized.includes("alta") || normalized.includes("urgente")) return "high"
  if (normalized.includes("media")) return "medium"
  if (normalized.includes("baixa")) return "low"
  return ""
}

function extractStatusValue(message: string) {
  const normalized = normalizeEngineText(message)
  if (normalized.includes("resolvido")) return "resolved"
  if (normalized.includes("aberto")) return "open"
  if (normalized.includes("rascunho")) return "draft"
  return ""
}

function extractResponsibleValue(message: string) {
  const match = message.match(/(?:adicione|coloque|defina)\s+(.+?)\s+como\s+responsavel/iu)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

function extractDocumentTitleForRename(message: string) {
  const match = message.match(/(?:renomeie|renomear|mude)\s+(?:esse documento|esse contrato|esse arquivo|esse relatorio|esse relatório|o nome dele)?\s*(?:para)\s+(.+)$/iu)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

function extractResolvedFields(message: string, resolvedIntent: OperationsResolvedIntent) {
  const readField = inferReadFieldFromMessage(message)

  const entities: OperationsResolvedIntent["entities"] = {
    ...resolvedIntent.entities,
  }

  return {
    readFields: readField ? [readField] : [],
    entities: {
      ...entities,
      amount: entities.amount ?? "",
      notes: extractUpdatedNotes(message) || entities.notes || null,
      phone: extractPhone(message) || entities.phone || null,
      email: extractEmail(message) || entities.email || null,
      name: extractUpdatedClientName(message) || extractDocumentTitleForRename(message) || entities.name || null,
      company: extractUpdatedCompany(message) || entities.company || null,
      priority: extractPriorityValue(message) || entities.priority || null,
      status: extractStatusValue(message) || entities.status || null,
      responsible: extractResponsibleValue(message) || entities.responsible || null,
    } as OperationsResolvedIntent["entities"],
  }
}

function inferPreferredEntityType(resolvedIntent: OperationsResolvedIntent, message: string) {
  if (resolvedIntent.entityType) {
    return resolvedIntent.entityType
  }

  const normalized = normalizeEngineText(message)
  if (/\b(gasto|despesa)\b/.test(normalized)) return "expense"
  if (/\b(ganho|receita|entrada)\b/.test(normalized)) return "income"
  if (/\b(chamado|ticket)\b/.test(normalized)) return "ticket"
  if (/\b(projeto|operacao|operação)\b/.test(normalized)) return "project"
  if (/\b(documento|contrato|arquivo|relatorio|relatório)\b/.test(normalized)) return "document"
  if (/\b(reuniao|reunião)\b/.test(normalized)) return "meeting"
  if (/\b(lead)\b/.test(normalized)) return "lead"
  if (/\b(produto)\b/.test(normalized)) return "product"
  if (/\b(servico|serviço)\b/.test(normalized)) return "service"

  return null
}

function inferReferenceActionType(resolvedIntent: OperationsResolvedIntent) {
  return resolvedIntent.actionType === "read" || resolvedIntent.actionType === "update"
    ? resolvedIntent.actionType
    : null
}

export function resolveIntentReferences({
  resolvedIntent,
  message,
  conversationMemory,
}: {
  resolvedIntent: OperationsResolvedIntent
  message: string
  conversationMemory?: OperationsConversationMemory
}) {
  const referenceResolution = resolveConversationEntityReference({
    message,
    conversationMemory,
    preferredEntityType: inferPreferredEntityType(resolvedIntent, message),
  })
  const resolvedFields = extractResolvedFields(message, resolvedIntent)

  if (!referenceResolution.reference.mode) {
    return {
      ...resolvedIntent,
      entities: resolvedFields.entities,
      readFields: resolvedFields.readFields,
    } satisfies OperationsResolvedIntent
  }

  if (referenceResolution.isAmbiguous) {
    return {
      ...resolvedIntent,
      entities: resolvedFields.entities,
      readFields: resolvedFields.readFields,
      unresolvedReference: "ambiguous_reference",
      clarificationQuestion: buildAmbiguousReferenceMessage(inferPreferredEntityType(resolvedIntent, message)),
      targetReference: referenceResolution.reference.raw,
    } satisfies OperationsResolvedIntent
  }

  if (!referenceResolution.resolvedEntity) {
    return {
      ...resolvedIntent,
      entities: resolvedFields.entities,
      readFields: resolvedFields.readFields,
      unresolvedReference: "missing_reference_target",
      clarificationQuestion: buildMissingReferenceMessage(
        inferPreferredEntityType(resolvedIntent, message),
        inferReferenceActionType(resolvedIntent),
      ),
      targetReference: referenceResolution.reference.raw,
    } satisfies OperationsResolvedIntent
  }

  const resolvedEntity = referenceResolution.resolvedEntity
  const targetType = resolvedEntity.entityType ?? resolvedIntent.entityType ?? null

  return {
    ...resolvedIntent,
    entityType: (targetType as OperationsResolvedIntent["entityType"]) ?? null,
    area: (resolvedEntity.area as OperationsResolvedIntent["area"]) ?? resolvedIntent.area ?? null,
    targetReference: referenceResolution.reference.raw,
    resolvedFrom: referenceResolution.resolvedFrom,
    resolvedEntity,
    unresolvedReference: null,
    entities: {
      ...resolvedEntity.fields,
      ...resolvedFields.entities,
      clientId:
        targetType === "client"
          ? (resolvedEntity.id ?? resolvedFields.entities.clientId ?? null)
          : resolvedFields.entities.clientId ?? null,
      clientName:
        targetType === "client"
          ? resolvedEntity.name
          : (resolvedFields.entities.clientName ?? null),
      title:
        resolvedFields.entities.title ??
        resolvedEntity.fields.title ??
        resolvedEntity.name,
      subject:
        resolvedFields.entities.subject ??
        resolvedEntity.fields.subject ??
        resolvedEntity.name,
    },
    readFields: resolvedFields.readFields,
  } satisfies OperationsResolvedIntent
}
