import { operationalActionAliases, type OperationalActionType } from "@/lib/cos-engine/action-registry"
import { operationalAreaAliases, operationalEntityAliases, operationalReferenceAliases } from "@/lib/cos-engine/entity-aliases"
import { operationalEntityRegistry, type OperationalArea } from "@/lib/cos-engine/entity-registry"
import type { OperationsEngineContext } from "@/lib/cos-engine/types"
import type { OperationalEntityType } from "@/lib/cos-engine/entity-fields"

type OperationalClassification = {
  area: OperationalArea | null
  entityType: OperationalEntityType | null
  actionType: OperationalActionType | null
  unresolvedReference?: string | null
}

function normalizeModelText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function includesAlias(normalizedMessage: string, aliases: readonly string[]) {
  return aliases.some((alias) => normalizedMessage.includes(normalizeModelText(alias)))
}

export function summarizeOperationalModelForPrompt() {
  return Object.entries(operationalEntityRegistry).map(([entityType, config]) => ({
    entityType,
    area: config.area,
    label: config.label,
    aliases: [...config.aliases],
    fields: [...config.fields],
    supportedActionKinds: [...config.supportedActionKinds],
    executableActionKinds: [...config.executableActionKinds],
  }))
}

export function inferOperationalAreaFromEntity(entityType: OperationalEntityType | null) {
  return entityType ? operationalEntityRegistry[entityType].area : null
}

export function detectOperationalActionType(message: string) {
  const normalizedMessage = normalizeModelText(message)
  const actionOrder: OperationalActionType[] = [
    "count",
    "summarize",
    "search",
    "list",
    "update",
    "create",
    "register",
    "launch",
    "generate",
    "open",
    "read",
    "classify",
    "extract",
    "ask_clarification",
  ]

  for (const actionType of actionOrder) {
    if (includesAlias(normalizedMessage, operationalActionAliases[actionType])) {
      return actionType
    }
  }

  return null
}

export function detectOperationalEntityType(message: string, context?: OperationsEngineContext) {
  const normalizedMessage = normalizeModelText(message)
  const entries = Object.entries(operationalEntityAliases) as Array<[OperationalEntityType, readonly string[]]>

  for (const [entityType, aliases] of entries) {
    if (includesAlias(normalizedMessage, aliases)) {
      return entityType
    }
  }

  if (context?.subArea === "clientes") return "client"
  if (context?.subArea === "leads") return "lead"
  if (context?.subArea === "produtos") return "product"
  if (context?.subArea === "servicos") return "service"
  if (context?.subArea === "ganhos") return "income"
  if (context?.subArea === "gastos") return "expense"
  if (context?.subArea === "projetos") return "project"
  if (context?.subArea === "ordens") return "order"
  if (context?.subArea === "processos") return "process"
  if (context?.subArea === "contratos") return "contract"
  if (context?.subArea === "arquivos") return "file"
  if (context?.subArea === "relatorios") return "report"
  if (context?.area === "reunioes") return "meeting"
  if (context?.area === "suporte") return "ticket"
  if (context?.area === "sistema") return "system_log"

  return null
}

export function detectOperationalArea(message: string, context?: OperationsEngineContext) {
  const normalizedMessage = normalizeModelText(message)
  const entries = Object.entries(operationalAreaAliases) as Array<[OperationalArea, readonly string[]]>

  for (const [area, aliases] of entries) {
    if (includesAlias(normalizedMessage, aliases)) {
      return area
    }
  }

  return (context?.area as OperationalArea) || null
}

export function classifyOperationalRequest(message: string, context?: OperationsEngineContext): OperationalClassification {
  const entityType = detectOperationalEntityType(message, context)
  const areaFromEntity = inferOperationalAreaFromEntity(entityType)
  const area = areaFromEntity ?? detectOperationalArea(message, context)
  const actionType = detectOperationalActionType(message)
  const normalizedMessage = normalizeModelText(message)
  const unresolvedReference = includesAlias(normalizedMessage, operationalReferenceAliases) ? "context_reference" : null

  if (!entityType && !actionType && !area) {
    return {
      area: null,
      entityType: null,
      actionType: null,
      unresolvedReference,
    }
  }

  return {
    area,
    entityType,
    actionType,
    unresolvedReference,
  }
}

export function isOperationalActionExecutable(entityType: OperationalEntityType | null, actionType: OperationalActionType | null) {
  if (!entityType || !actionType) {
    return false
  }

  return operationalEntityRegistry[entityType].executableActionKinds.includes(actionType)
}

function humanizeEntity(entityType: OperationalEntityType | null) {
  return entityType ? operationalEntityRegistry[entityType].label : "recurso"
}

export function buildOperationalClarificationQuestion(input: {
  entityType: OperationalEntityType | null
  actionType: OperationalActionType | null
  missingFields?: string[]
}) {
  const field = input.missingFields?.[0]
  const entityLabel = humanizeEntity(input.entityType)

  if (!field) {
    return null
  }

  if (field === "name") return `Qual e o nome do ${entityLabel}?`
  if (field === "title") return `Qual sera o titulo d${entityLabel === "reuniao" ? "a" : "o"} ${entityLabel}?`
  if (field === "amount" || field === "value") return `Qual valor devo registrar nesse ${entityLabel}?`
  if (field === "client" || field === "clientName") return `Qual cliente devo usar nesse ${entityLabel}?`
  if (field === "description") return `Pode me descrever melhor ${entityLabel === "chamado" ? "o problema" : `esse ${entityLabel}`}?`
  if (field === "phone") return `Qual telefone devo usar nesse ${entityLabel}?`
  if (field === "email") return `Qual email devo usar nesse ${entityLabel}?`

  return input.actionType === "update"
    ? `O que voce quer atualizar nesse ${entityLabel}?`
    : `Preciso de mais detalhes sobre esse ${entityLabel}.`
}

export function buildOperationalUnsupportedReply(input: {
  entityType: OperationalEntityType | null
  actionType: OperationalActionType | null
}) {
  const entityLabel = humanizeEntity(input.entityType)

  if (!input.entityType || !input.actionType) {
    return "Ainda nao consigo fazer isso com seguranca. Posso ajudar com clientes, financeiro, operacoes, documentos, reunioes e suporte."
  }

  if (isOperationalActionExecutable(input.entityType, input.actionType)) {
    return null
  }

  if (input.actionType === "update") {
    return `Entendi que voce quer atualizar ${entityLabel === "cliente" ? "um cliente" : `um ${entityLabel}`}, mas essa execucao ainda nao esta conectada. Posso seguir com clientes, financeiro, operacoes, documentos, reunioes e suporte.`
  }

  if (input.actionType === "create" || input.actionType === "register" || input.actionType === "generate" || input.actionType === "open") {
    return `Entendi que voce quer cadastrar ${entityLabel === "cliente" ? "um cliente" : `um ${entityLabel}`}, mas essa execucao ainda nao esta conectada. Posso seguir com clientes, financeiro, operacoes, documentos, reunioes e suporte.`
  }

  return `Entendi que voce quer consultar ${entityLabel === "cliente" ? "clientes" : `${entityLabel}`}, mas essa execucao ainda nao esta conectada. Posso seguir com clientes, financeiro, operacoes, documentos, reunioes e suporte.`
}

export function buildOperationalMissingFields(input: {
  entityType: OperationalEntityType | null
  actionType: OperationalActionType | null
  entities: Record<string, string | number | boolean | null | undefined>
}) {
  if (!input.entityType) {
    return []
  }

  if (input.entityType === "lead" && (input.actionType === "create" || input.actionType === "register")) {
    return input.entities.name ? [] : ["name"]
  }

  if (input.entityType === "product" && (input.actionType === "create" || input.actionType === "register")) {
    return input.entities.name ? [] : ["name"]
  }

  if (input.entityType === "service" && (input.actionType === "create" || input.actionType === "register")) {
    return input.entities.name ? [] : ["name"]
  }

  if (input.entityType === "proposal" && (input.actionType === "create" || input.actionType === "generate")) {
    if (input.entities.clientName || input.entities.client) {
      return []
    }

    return ["clientName"]
  }

  if (input.entityType === "negotiation" && (input.actionType === "create" || input.actionType === "register")) {
    if (input.entities.clientName || input.entities.client) {
      return []
    }

    return ["clientName"]
  }

  if (input.entityType === "ticket" && (input.actionType === "create" || input.actionType === "open")) {
    return input.entities.subject || input.entities.title ? [] : ["description"]
  }

  if (input.entityType === "meeting" && (input.actionType === "create" || input.actionType === "open")) {
    return input.entities.title ? [] : ["title"]
  }

  if (input.entityType === "document" && (input.actionType === "create" || input.actionType === "generate")) {
    return input.entities.title ? [] : ["title"]
  }

  return []
}

export function buildOperationalModelMetadata(message: string, context?: OperationsEngineContext) {
  const classification = classifyOperationalRequest(message, context)
  const missingFields = buildOperationalMissingFields({
    entityType: classification.entityType,
    actionType: classification.actionType,
    entities: {},
  })

  return {
    ...classification,
    missingFields,
    clarificationQuestion: buildOperationalClarificationQuestion({
      entityType: classification.entityType,
      actionType: classification.actionType,
      missingFields,
    }),
    unsupportedReason: buildOperationalUnsupportedReply({
      entityType: classification.entityType,
      actionType: classification.actionType,
    }),
  }
}
