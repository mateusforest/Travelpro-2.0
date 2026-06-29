import type { ConversationContextMessageRow } from "@/lib/cos-engine/context-window"
import type {
  OperationsConversationClient,
  OperationsConversationEntity,
  OperationsConversationMemory,
  OperationsEngineIntent,
} from "@/lib/cos-engine/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readEntities(metadata: Record<string, unknown>) {
  if (!isRecord(metadata.entities)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(metadata.entities).filter(([, value]) => {
      return value === null || ["string", "number", "boolean", "undefined"].includes(typeof value)
    }),
  ) as Record<string, string | number | boolean | null | undefined>
}

function extractClientFromMetadata(metadata: Record<string, unknown>): OperationsConversationClient | null {
  const entities = readEntities(metadata)
  const targetType = readString(metadata.targetType)
  const targetId = readString(metadata.targetId) ?? readString(metadata.resultId)
  const targetName =
    readString(metadata.targetName) ??
    readString(entities.name) ??
    readString(entities.clientName)

  const action = readString(metadata.action)
  const intent = readString(metadata.intent)
  const looksLikeClientAction =
    targetType === "client" || action === "create_client" || action === "update_client" || intent === "create_client" || intent === "update_client"

  if (!looksLikeClientAction || !targetId || !targetName) {
    return null
  }

  return {
    id: targetId,
    name: targetName,
    email: readString(entities.email),
    phone: readString(entities.phone),
    company: readString(entities.company),
    notes: readString(entities.notes),
  }
}

function extractGenericEntityFromMetadata(metadata: Record<string, unknown>): OperationsConversationEntity | null {
  const entities = readEntities(metadata)
  const targetId = readString(metadata.targetId) ?? readString(metadata.resultId)
  const targetName =
    readString(metadata.targetName) ??
    readString(entities.name) ??
    readString(entities.title) ??
    readString(entities.subject) ??
    readString(entities.clientName)
  const entityType = readString(metadata.targetType) ?? readString(metadata.entityType)
  const area = readString(metadata.area)
  const executionStatus = readString(metadata.executionStatus)
  const action = readString(metadata.actionType) ?? readString(metadata.action)
  const sourceIntent = readString(metadata.intent)
  const confidence = typeof metadata.confidence === "number" ? metadata.confidence : null
  const createdAt = readString(metadata.createdAt)
  const updatedAt = readString(metadata.updatedAt)

  const canUseClassifiedEntity =
    executionStatus === "not_executed" &&
    (readString(metadata.entityType) || readString(metadata.targetType)) &&
    targetName

  if ((executionStatus !== "executed" && !canUseClassifiedEntity) || !targetName) {
    return null
  }

  return {
    id: targetId ?? null,
    name: targetName,
    entityType: (entityType as OperationsConversationEntity["entityType"]) ?? null,
    area: (area as OperationsConversationEntity["area"]) ?? null,
    action: (action as OperationsConversationEntity["action"]) ?? null,
    sourceIntent: (sourceIntent as OperationsConversationEntity["sourceIntent"]) ?? null,
    createdAt,
    updatedAt,
    confidence,
    fields: entities,
  }
}

function extractSuccessfulAction(metadata: Record<string, unknown>) {
  const executionStatus = readString(metadata.executionStatus)
  const action = readString(metadata.action)

  if (executionStatus !== "executed" || !action) {
    return null
  }

  return action as OperationsEngineIntent
}

export function createEmptyConversationMemory(): OperationsConversationMemory {
  return {
    lastSuccessfulAction: null,
    lastResultId: null,
    lastEntities: {},
    lastClient: null,
    lastClientId: null,
    lastClientName: null,
    lastEntity: null,
    lastEntityType: null,
    lastEntityArea: null,
    lastEntityName: null,
    recentEntities: [],
  }
}

export function buildConversationMemory(rows: ConversationContextMessageRow[]): OperationsConversationMemory {
  const memory = createEmptyConversationMemory()

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const metadata = rows[index]?.metadata
    if (!isRecord(metadata)) {
      continue
    }

    if (!memory.lastSuccessfulAction) {
      memory.lastSuccessfulAction = extractSuccessfulAction(metadata)
    }

    if (!memory.lastResultId) {
      memory.lastResultId = readString(metadata.resultId)
    }

    if (Object.keys(memory.lastEntities).length === 0) {
      memory.lastEntities = readEntities(metadata)
    }

    if (!memory.lastClient) {
      memory.lastClient = extractClientFromMetadata(metadata)
      memory.lastClientId = memory.lastClient?.id ?? null
      memory.lastClientName = memory.lastClient?.name ?? null
    }

    const extractedEntity = extractGenericEntityFromMetadata(metadata)

    if (extractedEntity) {
      if (!memory.lastEntity) {
        memory.lastEntity = extractedEntity
      }

      if (!memory.lastEntityType) {
        memory.lastEntityType = (extractedEntity.entityType as OperationsConversationMemory["lastEntityType"]) ?? null
      }

      if (!memory.lastEntityArea) {
        memory.lastEntityArea = (extractedEntity.area as OperationsConversationMemory["lastEntityArea"]) ?? null
      }

      if (!memory.lastEntityName) {
        memory.lastEntityName = extractedEntity.name
      }

      if (
        !memory.recentEntities.some((entity) => {
          if (entity.id && extractedEntity.id) {
            return entity.id === extractedEntity.id
          }

          return entity.entityType === extractedEntity.entityType && entity.name === extractedEntity.name
        })
      ) {
        memory.recentEntities.push(extractedEntity)
      }
    }
  }

  return memory
}
