import { operationalEntityAliases } from "@/lib/cos-engine/entity-aliases"
import type { OperationalEntityType } from "@/lib/cos-engine/entity-fields"
import type { OperationsConversationEntity, OperationsConversationMemory } from "@/lib/cos-engine/types"
import { normalizeEngineText } from "@/lib/cos-engine/operations-tools"

type SpecificReference = {
  entityType: OperationalEntityType | null
  raw: string | null
  mode: "specific" | "generic" | "latest" | null
}

const genericReferencePattern =
  /\b(ele|ela|dele|dela|nele|nela|esse|essa|este|esta|o mesmo|a mesma|ultimo|ultima|último|última)\b/

const specificReferenceMap: Array<{ entityType: OperationalEntityType; aliases: string[] }> = [
  { entityType: "client", aliases: ["esse cliente", "essa cliente", "ultimo cliente", "ultima cliente", "último cliente", "última cliente"] },
  { entityType: "lead", aliases: ["esse lead", "essa lead", "ultimo lead", "último lead"] },
  { entityType: "product", aliases: ["esse produto", "esse item"] },
  { entityType: "service", aliases: ["esse servico", "esse serviço"] },
  { entityType: "project", aliases: ["esse projeto", "ultimo projeto", "último projeto"] },
  { entityType: "order", aliases: ["essa ordem", "essa operacao", "essa operação"] },
  { entityType: "process", aliases: ["esse processo"] },
  { entityType: "proposal", aliases: ["essa proposta"] },
  { entityType: "negotiation", aliases: ["essa negociacao", "essa negociação"] },
  { entityType: "income", aliases: ["esse ganho", "essa entrada", "ultimo ganho", "último ganho", "ultima entrada", "última entrada"] },
  { entityType: "expense", aliases: ["esse gasto", "essa despesa", "ultimo gasto", "último gasto", "essa saida", "essa saída"] },
  { entityType: "document", aliases: ["esse documento", "ultimo documento", "último documento"] },
  { entityType: "contract", aliases: ["esse contrato", "ultimo contrato", "último contrato"] },
  { entityType: "file", aliases: ["esse arquivo", "ultimo arquivo", "último arquivo"] },
  { entityType: "report", aliases: ["esse relatorio", "esse relatório", "ultimo relatorio", "último relatório"] },
  { entityType: "meeting", aliases: ["essa reuniao", "essa reunião", "ultima reuniao", "última reunião"] },
  { entityType: "ticket", aliases: ["esse chamado", "esse ticket", "ultimo chamado", "último chamado"] },
]

function entityLabel(entityType: OperationalEntityType | null) {
  if (!entityType) return "item"

  const aliases = operationalEntityAliases[entityType]
  return aliases?.[0] ?? "item"
}

export function detectSpecificReference(message: string): SpecificReference {
  const normalized = normalizeEngineText(message)

  for (const reference of specificReferenceMap) {
    const matchedAlias = reference.aliases.find((alias) => normalized.includes(normalizeEngineText(alias)))
    if (matchedAlias) {
      return {
        entityType: reference.entityType,
        raw: matchedAlias,
        mode: matchedAlias.includes("ultimo") || matchedAlias.includes("último") || matchedAlias.includes("ultima") || matchedAlias.includes("última")
          ? "latest"
          : "specific",
      }
    }
  }

  if (genericReferencePattern.test(normalized)) {
    return {
      entityType: null,
      raw: normalized.match(genericReferencePattern)?.[0] ?? null,
      mode: /ultimo|último|ultima|última/.test(normalized) ? "latest" : "generic",
    }
  }

  return {
    entityType: null,
    raw: null,
    mode: null,
  }
}

function chooseRecentEntity(
  recentEntities: OperationsConversationEntity[],
  entityType: OperationalEntityType | null,
) {
  if (entityType) {
    return recentEntities.find((entity) => entity.entityType === entityType) ?? null
  }

  return recentEntities[0] ?? null
}

export function resolveConversationEntityReference(input: {
  message: string
  conversationMemory?: OperationsConversationMemory
  preferredEntityType?: OperationalEntityType | null
}) {
  const reference = detectSpecificReference(input.message)
  const recentEntities = input.conversationMemory?.recentEntities ?? []
  const preferredEntityType = reference.entityType ?? input.preferredEntityType ?? null
  const typedEntity = chooseRecentEntity(recentEntities, preferredEntityType)
  const resolvedEntity =
    typedEntity ??
    (preferredEntityType ? null : input.conversationMemory?.lastEntity ?? null)

  if (!reference.mode) {
    return {
      reference,
      resolvedEntity: null,
      resolvedFrom: null,
      isAmbiguous: false,
    }
  }

  if (!resolvedEntity) {
    return {
      reference,
      resolvedEntity: null,
      resolvedFrom: null,
      isAmbiguous: false,
    }
  }

  const sameTypeEntities = preferredEntityType
    ? recentEntities.filter((entity) => entity.entityType === preferredEntityType)
    : recentEntities
  const isAmbiguous =
    sameTypeEntities.length > 1 &&
    !reference.raw?.includes("ultimo") &&
    !reference.raw?.includes("último") &&
    !reference.raw?.includes("ultima") &&
    !reference.raw?.includes("última")

  return {
    reference,
    resolvedEntity: isAmbiguous ? null : resolvedEntity,
    resolvedFrom: isAmbiguous ? null : (reference.mode === "specific" || reference.mode === "latest" ? "recentEntities" : "lastEntity"),
    isAmbiguous,
  }
}

export function inferReadFieldFromMessage(message: string) {
  const normalized = normalizeEngineText(message)

  if (/\b(valor|preco|preço|quanto)\b/.test(normalized)) return "amount"
  if (/\btelefone|celular\b/.test(normalized)) return "phone"
  if (/\bemail|e-mail\b/.test(normalized)) return "email"
  if (/\bprioridade\b/.test(normalized)) return "priority"
  if (/\bstatus\b/.test(normalized)) return "status"
  if (/\bobservacao|observação|nota\b/.test(normalized)) return "notes"
  if (/\bresponsavel|responsável\b/.test(normalized)) return "responsible"
  if (/\bquem abriu\b/.test(normalized)) return "openedBy"
  if (/\bultimo|último|ultima|última\b/.test(normalized)) return "latest"

  return null
}

export function buildMissingReferenceMessage(
  entityType: OperationalEntityType | null,
  actionType: "read" | "update" | null = null,
) {
  const label = entityLabel(entityType)

  if (entityType === "expense") return actionType === "read" ? "Qual gasto voce quer consultar?" : "Qual gasto voce quer alterar?"
  if (entityType === "income") return "Qual entrada voce quer consultar?"
  if (entityType === "ticket") return actionType === "read" ? "Qual chamado voce quer consultar?" : "Qual chamado voce quer atualizar?"
  if (entityType === "project" || entityType === "order" || entityType === "process") {
    return actionType === "read" ? `Qual ${label} voce quer consultar?` : `Qual ${label} voce quer atualizar?`
  }

  return actionType === "read" ? "Qual item voce quer consultar?" : "Qual item voce quer atualizar?"
}

export function buildAmbiguousReferenceMessage(entityType: OperationalEntityType | null) {
  const label = entityLabel(entityType)

  return entityType ? `Encontrei mais de um ${label} recente. Pode especificar melhor?` : "Voce quer alterar qual item?"
}
