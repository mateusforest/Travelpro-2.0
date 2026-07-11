import type { OperationsEngineContext } from "@/lib/cos-engine/types"
import {
  buildOperationalModelMetadata,
  classifyOperationalRequest,
} from "@/lib/cos-engine/operational-model"
import { classifyFileIntake } from "@/lib/cos-engine/file-intake"
import { findQuickActionByLabel } from "@/lib/cos-engine/intake-registry"
import {
  isClientsContext,
  isDocumentsContext,
  isFinancialContext,
  isMeetingsContext,
  isOperationsContext,
  isSupportContext,
} from "@/lib/cos-engine/operations-context"

export function normalizeEngineText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function hasGenericReference(message: string) {
  return /\b(ele|ela|dele|dela|nele|nela|esse|essa|este|esta|o mesmo|a mesma|ultimo|ultima|último|última)\b/.test(
    normalizeEngineText(message),
  )
}

export function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function extractEmail(message: string) {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] || ""
}

export function extractPhone(message: string) {
  const match = message.match(/(?:\+?\d[\d\s().-]{7,}\d)/)
  return match?.[0]?.trim() || ""
}

export function extractMoneyValue(message: string) {
  const match = message.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)/)
  if (!match?.[1]) return ""
  return match[1]
}

export function extractAfterKeyword(message: string, keywords: string[]) {
  const normalized = normalizeEngineText(message)

  for (const keyword of keywords) {
    const index = normalized.indexOf(keyword)
    if (index >= 0) {
      return message.slice(index + keyword.length).trim()
    }
  }

  return ""
}

function extractNamedEntity(message: string, aliases: string[]) {
  const escapedAliases = aliases
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((left, right) => right.length - left.length)
  const aliasPattern = escapedAliases.join("|")
  const patterns = [
    new RegExp(`(?:crie|criar|cadastre|cadastrar|gere|gerar|abra|abrir|registre|registrar)\\s+(?:um\\s+|uma\\s+)?(?:${aliasPattern})\\s+(?:chamad[oa]\\s+)?(.+)$`, "iu"),
    new RegExp(`(?:${aliasPattern})\\s+chamad[oa]\\s+(.+)$`, "iu"),
    new RegExp(`(?:${aliasPattern})\\s+(.+)$`, "iu"),
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    const candidate = match?.[1]?.trim()

    if (candidate) {
      return toTitleCase(cleanupEntityTail(candidate))
    }
  }

  return ""
}

export function cleanupEntityTail(value: string) {
  return value
    .replace(/\b(com|para|chamado|chamada|nome|email|telefone)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripLeadingCommand(value: string) {
  return value
    .replace(/^(crie|criar|novo|nova|cadastrar|cadastre|registrar|registre|lancar|lance|adicionar|abrir|iniciar|inicie)\s+/i, "")
    .trim()
}

function sanitizeClientNameCandidate(value: string) {
  return value
    .replace(/\bcomo cliente\b/giu, " ")
    .replace(/\bcliente\b/giu, " ")
    .replace(/\bcom email\b.*$/iu, "")
    .replace(/\bemail\b.*$/iu, "")
    .replace(/\btelefone\b.*$/iu, "")
    .replace(/\?+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isLikelyClientName(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false

  const normalized = normalizeEngineText(trimmed)
  if (
    /^(crie|criar|cadastre|cadastrar|cliente|novo|nova|um|uma|como)$/.test(normalized) ||
    normalized.includes("registrar gasto") ||
    normalized.includes("registrar receita")
  ) {
    return false
  }

  return /^[\p{L}][\p{L}\p{M}'’-]*(?:\s+[\p{L}][\p{L}\p{M}'’-]*)*$/u.test(trimmed)
}

function extractClientNameByPatterns(message: string) {
  const patterns = [
    /^(?:crie|criar|cadastre|cadastrar|adicione|adicionar)\s+(.+?)\s+como\s+cliente$/iu,
    /^(?:crie|criar|cadastre|cadastrar|adicione|adicionar)\s+(?:um\s+|uma\s+)?cliente\s+(.+)$/iu,
    /^(?:crie|criar|cadastre|cadastrar|adicione|adicionar)\s+cliente\s+(.+)$/iu,
    /^cliente\s+(.+)$/iu,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    const candidate = sanitizeClientNameCandidate(match?.[1] || "")

    if (candidate && isLikelyClientName(candidate)) {
      return toTitleCase(candidate)
    }
  }

  return ""
}

export function extractClientName(message: string, context: OperationsEngineContext) {
  const email = extractEmail(message)
  const phone = extractPhone(message)
  const withoutEmail = email ? message.replace(email, " ") : message
  const withoutPhone = phone ? withoutEmail.replace(phone, " ") : withoutEmail
  const patternedName = extractClientNameByPatterns(withoutPhone)

  if (patternedName) {
    return patternedName
  }

  const direct = extractAfterKeyword(withoutPhone, [
    "cliente chamado",
    "cliente com nome",
    "cadastrar cliente",
    "adicionar cliente",
    "adicione cliente",
    "crie um cliente chamado",
    "crie cliente chamado",
    "crie um cliente",
    "crie cliente",
    "adicione um cliente chamado",
    "adicione cliente chamado",
    "adicione um cliente",
    "novo cliente",
  ])

  const fallback = isClientsContext(context) ? withoutPhone : ""
  const raw = stripLeadingCommand(cleanupEntityTail(direct || fallback))

  if (!raw) return ""

  const cleaned = sanitizeClientNameCandidate(raw)

  if (!isLikelyClientName(cleaned)) {
    return ""
  }

  return toTitleCase(cleaned)
}

export function recoverClientNameFromMessage(message: string) {
  return extractClientName(message, {
    area: "",
    subArea: "",
  })
}

export function inferFinancialType(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)

  if (/\b(gasto|despesa|pagar|pagamento)\b/.test(normalized)) return "expense"
  if (/\b(ganho|receita|venda|faturamento|consultoria|entrada)\b/.test(normalized)) return "income"
  if (context.subArea === "gastos") return "expense"
  if (context.subArea === "ganhos") return "income"

  return isFinancialContext(context) ? "expense" : ""
}

export function extractFinancialTitle(message: string) {
  const explicit = extractAfterKeyword(message, ["com ", "referente a ", "de "])
  const raw = cleanupEntityTail(explicit)

  if (raw) {
    const cleaned = raw.replace(/^\d+(?:[.,]\d+)?\s*/, "").trim()
    return toTitleCase(cleaned)
  }

  const amount = extractMoneyValue(message)
  if (!amount) return ""

  const remainder = message.slice(message.toLowerCase().indexOf(amount.toLowerCase()) + amount.length).trim()
  return toTitleCase(stripLeadingCommand(cleanupEntityTail(remainder)))
}

export function extractLeadName(message: string) {
  return extractNamedEntity(message, ["lead", "leads"])
}

export function extractProductName(message: string) {
  return extractNamedEntity(message, ["produto", "produtos"])
}

export function extractServiceName(message: string) {
  return extractNamedEntity(message, ["servico", "servicos", "serviço", "serviços"])
}

export function extractOperationTitle(message: string, context: OperationsEngineContext) {
  if (/(?:criar|crie|cadastrar|cadastre|abrir|abra|iniciar|inicie)\s+viagem\s+para\s+/iu.test(message)) {
    return ""
  }

  const direct = extractAfterKeyword(message, [
    "chamada ",
    "chamado ",
    "viagem chamada ",
    "viagem com titulo ",
    "criar viagem ",
    "crie viagem ",
    "cadastrar viagem ",
    "cadastre viagem ",
    "abrir viagem ",
    "iniciar viagem ",
    "criar operacao ",
    "crie operacao ",
    "nova operacao ",
    "abrir processo ",
    "criar processo ",
  ])

  const raw = stripLeadingCommand(cleanupEntityTail(direct || (isOperationsContext(context) ? message : "")))
  if (/^para\b/i.test(raw)) {
    return ""
  }
  return toTitleCase(raw)
}

export function extractProjectTitle(message: string) {
  return extractNamedEntity(message, ["projeto", "projetos"])
}

export function extractOrderTitle(message: string) {
  return extractNamedEntity(message, ["ordem", "ordens", "ordem de servico", "ordem de serviço"])
}

export function extractProcessTitle(message: string) {
  return extractNamedEntity(message, ["processo", "processos"])
}

export function extractOperationClientName(message: string) {
  const patterns = [
    /cliente\s+([a-zA-ZÀ-ÿ0-9 ]+?)(?:\s+chamad[ao]|\s*$)/i,
    /(?:viagem|operacao|operação|processo|projeto)\s+para\s+([a-zA-ZÀ-ÿ0-9 ]+?)(?:\s*$|\s+com\s+)/i,
    /para\s+o?\s*cliente\s+([a-zA-ZÀ-ÿ0-9 ]+?)(?:\s*$|\s+com\s+)/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) {
      return toTitleCase(match[1].trim())
    }
  }

  return ""
}

export function detectDocumentType(message: string) {
  const normalized = normalizeEngineText(message)
  if (normalized.includes("contrato")) return "contrato"
  if (normalized.includes("proposta")) return "proposta"
  if (normalized.includes("relatorio")) return "relatório"
  if (normalized.includes("arquivo")) return "arquivo"
  return "outro"
}

export function extractDocumentTitle(message: string, context: OperationsEngineContext) {
  const direct = extractAfterKeyword(message, [
    "criar documento ",
    "novo documento ",
    "documento ",
  ])

  const raw = stripLeadingCommand(cleanupEntityTail(direct || (isDocumentsContext(context) ? message : "")))
  return toTitleCase(raw)
}

export function extractProposalTitle(message: string) {
  return extractNamedEntity(message, ["proposta", "propostas"])
}

export function extractNegotiationTitle(message: string) {
  return extractNamedEntity(message, ["negociacao", "negociações", "negociacoes", "negociação"])
}

export function extractMeetingTitle(message: string, context: OperationsEngineContext) {
  const direct = extractAfterKeyword(message, [
    "chamada ",
    "criar reuniao ",
    "crie reuniao ",
    "gravar reuniao ",
    "nova reuniao ",
  ])

  const raw = stripLeadingCommand(cleanupEntityTail(direct || (isMeetingsContext(context) ? message : "")))
  return toTitleCase(raw.replace(/^com\s+/i, ""))
}

export function detectSupportCategory(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)

  if (/\b(cobranca|cobranca|plano|assinatura)\b/.test(normalized)) return "Plano ou cobrança"
  if (/\b(integracao|integracoes)\b/.test(normalized)) return "Integrações"
  if (/\b(problema|erro|bug|tecnico)\b/.test(normalized)) return "Problema técnico"
  if (/\b(atendimento|humano|falar com atendimento)\b/.test(normalized)) return "Falar com atendimento"
  if (isSupportContext(context)) return "Dúvida sobre o COS"
  return "Dúvida sobre o COS"
}

export function extractSupportSubject(message: string) {
  const raw = cleanupEntityTail(
    extractAfterKeyword(message, [
      "abrir chamado de suporte ",
      "abrir chamado ",
      "preciso de ajuda com ",
      "ajuda com ",
    ]) || message,
  )

  return toTitleCase(raw)
}

export function extractQuotedOrTrailingTarget(message: string, aliases: string[]) {
  const named = extractNamedEntity(message, aliases)
  if (named) {
    return named
  }

  const cleaned = cleanupEntityTail(message)
  return cleaned ? toTitleCase(cleaned) : ""
}

export function extractPriorityFromMessage(message: string) {
  const normalized = normalizeEngineText(message)
  if (normalized.includes("urgente") || normalized.includes("alta")) return "high"
  if (normalized.includes("media")) return "medium"
  if (normalized.includes("baixa")) return "low"
  return ""
}

export function extractStatusFromMessage(message: string) {
  const normalized = normalizeEngineText(message)
  if (normalized.includes("resolvido")) return "resolved"
  if (normalized.includes("aberto")) return "open"
  return ""
}

export function extractNotesFromMessage(message: string) {
  const quoted = message.match(/["']([^"']+)["']/)
  if (quoted?.[1]) {
    return quoted[1].trim()
  }

  const match = message.match(/(?:observacao|observação|nota)\s+(.+)$/iu)
  return match?.[1]?.trim() || ""
}

export function extractResponsibleFromMessage(message: string) {
  const match = message.match(/(?:adicione|coloque|defina)\s+(.+?)\s+como\s+responsavel/iu)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

export function isFinancialSummaryQuery(message: string) {
  const normalized = normalizeEngineText(message)
  return /\b(qual meu saldo|mostrar resumo financeiro|resumo financeiro|saldo atual|quanto tenho em caixa|qual o saldo final|qual o balanco deste mes|qual o balanco do mes|balanco do mes|gastos do mes|ganhos do mes)\b/.test(
    normalized,
  )
}

export function looksLikeContextualRead(message: string) {
  const normalized = normalizeEngineText(message)

  return /\b(qual|quais|quanto|quem|ver|mostrar|consultar)\b/.test(normalized) && (hasGenericReference(message) || /\b(ultimo|último|ultima|última|chamado|documento|reuniao|reunião|gasto|entrada|cliente)\b/.test(normalized))
}

export function looksLikeContextualUpdate(message: string) {
  const normalized = normalizeEngineText(message)

  if (!hasGenericReference(message) && !/\b(esse gasto|esse chamado|esse documento|essa reuniao|essa reunião|esse projeto|essa operacao|essa operação|desse item|nesse gasto|nesse chamado)\b/.test(normalized)) {
    return false
  }

  return /\b(mude|altere|atualize|coloque|adicione|defina|renomeie|marque)\b/.test(normalized)
}

export function isClientsCountQuery(message: string) {
  const normalized = normalizeEngineText(message)
  return /\b(quantos clientes tenho|quantos clientes|qtd de clientes|total de clientes)\b/.test(normalized)
}

export function isRecentActivityQuery(message: string) {
  const normalized = normalizeEngineText(message)
  return /\b(listar ultimas atividades|ultimas atividades|ultimos registros|mostrar historico|o que fiz hoje)\b/.test(normalized)
}

export function classifyUnsupportedOperationsRequest(message: string) {
  const normalized = normalizeEngineText(message)

  if (/\b(exclu|delet|apag|remov)/.test(normalized)) {
    return {
      kind: "destructive" as const,
      message: "Essa acao de exclusao ainda nao esta disponivel por conversa no COS.",
    }
  }

  if (/\b(transf|pix|ted)\b/.test(normalized)) {
    return {
      kind: "financial_transfer" as const,
      message: "Transferencias e pagamentos ainda nao podem ser executados pelo COS.",
    }
  }

  if (/\b(envi|mand)/.test(normalized) && /\b(mensagem|whatsapp|email|e-mail)\b/.test(normalized)) {
    return {
      kind: "external_message" as const,
      message: "O envio de mensagens externas ainda nao esta disponivel pelo COS.",
    }
  }

  if (/\b(envie|enviar|mande|mandar|compartilhe|compartilhar)\b/.test(normalized) && /\b(contrato|documento|relatorio|relatório|email|e-mail|whatsapp)\b/.test(normalized)) {
    return {
      kind: "external_send_requires_confirmation" as const,
      message:
        "Entendi que voce quer enviar este documento, mas o envio externo ainda nao esta conectado. Posso preparar a acao e indicar os dados necessarios.",
    }
  }

  if (/\b(edite|editar|altere|alterar|atualize|atualizar)\b/.test(normalized)) {
    return {
      kind: "edit" as const,
      message: "Edicoes por conversa ainda nao estao disponiveis no COS.",
    }
  }

  return null
}

export function inferOperationalEntitiesFromMessage(
  message: string,
  context: OperationsEngineContext,
  attachment?: { fileName?: string | null; fileMimeType?: string | null },
): {
  area: ReturnType<typeof classifyOperationalRequest>["area"]
  entityType: ReturnType<typeof classifyOperationalRequest>["entityType"]
  actionType: ReturnType<typeof classifyOperationalRequest>["actionType"]
  clarificationQuestion: string | null
  unsupportedReason: string | null
  unresolvedReference?: string | null
  entities: Record<string, string | number | boolean | null | undefined>
  intakeType: import("@/lib/cos-engine/intake-registry").OperationsIntakeType
  documentType: import("@/lib/cos-engine/intake-registry").OperationsDocumentType
  extractedEntityTypes: import("@/lib/cos-engine/entity-fields").OperationalEntityType[]
  suggestedActions: import("@/lib/cos-engine/assisted-actions").AssistedActionSuggestion[]
  extractionStatus: "awaiting_file" | "classified_only" | "preview_ready" | "needs_review"
  externalSendIntent: boolean
  externalSendBlockedReason: string | null
  fileName: string | null
  fileMimeType: string | null
} {
  const classification = classifyOperationalRequest(message, context)
  const metadata = buildOperationalModelMetadata(message, context)
  const intake = classifyFileIntake({
    message,
    fileName: attachment?.fileName ?? null,
    fileMimeType: attachment?.fileMimeType ?? null,
    entities: {},
  })
  const price = extractMoneyValue(message)
  const titleCandidates = {
    client: extractClientName(message, context),
    lead: extractLeadName(message),
    product: extractProductName(message),
    service: extractServiceName(message),
    project: extractProjectTitle(message),
    order: extractOrderTitle(message),
    process: extractProcessTitle(message),
    proposal: extractProposalTitle(message),
    negotiation: extractNegotiationTitle(message),
    document: extractDocumentTitle(message, context),
    meeting: extractMeetingTitle(message, context),
    ticket: extractSupportSubject(message),
  } as const

  const inferredTitle =
    (classification.entityType && titleCandidates[classification.entityType as keyof typeof titleCandidates]) || ""

  return {
    ...metadata,
    entities: {
      name:
        classification.entityType === "client"
          ? titleCandidates.client
          : classification.entityType === "lead"
            ? titleCandidates.lead
            : classification.entityType === "product"
              ? titleCandidates.product
              : classification.entityType === "service"
                ? titleCandidates.service
                : null,
      title:
        classification.entityType === "project"
          ? titleCandidates.project
          : classification.entityType === "order"
            ? titleCandidates.order
            : classification.entityType === "process"
              ? titleCandidates.process
              : classification.entityType === "proposal"
                ? titleCandidates.proposal
                : classification.entityType === "negotiation"
                  ? titleCandidates.negotiation
                  : classification.entityType === "document" ||
                      classification.entityType === "meeting" ||
                      classification.entityType === "ticket"
                    ? inferredTitle
                    : null,
      amount:
        classification.entityType === "expense" || classification.entityType === "income" || classification.entityType === "cash_flow"
          ? price
          : null,
      value:
        classification.entityType === "proposal" || classification.entityType === "negotiation" || classification.entityType === "contract"
          ? price
          : null,
      email: extractEmail(message),
      phone: extractPhone(message),
      subject: classification.entityType === "ticket" ? extractSupportSubject(message) : null,
      category: classification.entityType === "ticket" ? detectSupportCategory(message, context) : null,
      notes: extractNotesFromMessage(message) || null,
      priority: extractPriorityFromMessage(message) || null,
      status: extractStatusFromMessage(message) || null,
      responsible: extractResponsibleFromMessage(message) || null,
      type:
        classification.entityType === "document" ||
        classification.entityType === "contract" ||
        classification.entityType === "file" ||
        classification.entityType === "report"
          ? detectDocumentType(message)
          : null,
      clientName: extractOperationClientName(message),
      description: message.trim(),
    },
    intakeType: intake.intakeType,
    documentType: intake.documentType,
    extractedEntityTypes: intake.extractedEntityTypes,
    suggestedActions: intake.suggestedActions,
    extractionStatus: intake.extractionStatus,
    externalSendIntent: intake.externalSendIntent,
    externalSendBlockedReason: intake.externalSendBlockedReason,
    fileName: attachment?.fileName ?? null,
    fileMimeType: attachment?.fileMimeType ?? null,
  }
}

export function looksLikeFileIntake(message: string) {
  const normalized = normalizeEngineText(message)

  return /\b(analisar arquivo|analisar contrato|ler documento|extrair dados|anexar arquivo|anexar uma foto|cadastrar foto|documento anexado|arquivo anexado)\b/.test(
    normalized,
  )
}

export function looksLikeExternalSend(message: string) {
  const normalized = normalizeEngineText(message)

  return /\b(envie|enviar|mande|mandar|compartilhe|compartilhar)\b/.test(normalized) && /\b(email|e-mail|whatsapp|contrato|documento|relatorio|relatório)\b/.test(normalized)
}

export function inferQuickActionFromMessage(message: string) {
  const labels = ["cliente", "operacao", "contrato", "financeiro", "reuniao", "equipe", "arquivo", "foto", "documento", "tarefa", "relatorio", "formulario", "marketing", "integracao", "suporte"]

  for (const label of labels) {
    const action = findQuickActionByLabel(label)
    if (action && normalizeEngineText(message).includes(normalizeEngineText(label))) {
      return action
    }
  }

  return null
}

function hasClientReference(message: string) {
  const normalized = normalizeEngineText(message)

  return /\b(cliente|dele|dela|nele|nela|desse cliente|dessa cliente|esse cliente|essa cliente|ultimo cliente|ultima cliente)\b/.test(
    normalized,
  )
}

function hasClientUpdateField(message: string) {
  const normalized = normalizeEngineText(message)

  return /\b(telefone|celular|email|e-mail|nome|empresa|companhia|observacao|observacao|nota)\b/.test(normalized)
}

function extractUpdatedClientName(message: string) {
  const match = message.match(/(?:mude|altere|atualize|troque)\s+o?\s*nome(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

function extractExplicitTargetClientNameForUpdate(message: string) {
  const patterns = [
    /(?:do|da)\s+cliente\s+(.+?)\s+para\s+(?:\d{8,15}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/iu,
    /(?:do|da)\s+cliente\s+(.+?)\s+(?:com\s+email|com\s+telefone)/iu,
    /cliente\s+(.+?)\s+para\s+(?:\d{8,15}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/iu,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    const candidate = match?.[1]?.trim()

    if (candidate) {
      return toTitleCase(candidate)
    }
  }

  return ""
}

function extractUpdatedCompany(message: string) {
  const match = message.match(/(?:empresa|companhia)(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? match[1].trim() : ""
}

function extractUpdatedNotes(message: string) {
  const match = message.match(/(?:observacao|observa[cç][aã]o|nota)(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? match[1].trim() : ""
}

export function extractClientUpdateEntities(message: string) {
  return {
    clientName: extractExplicitTargetClientNameForUpdate(message),
    name: extractUpdatedClientName(message),
    email: extractEmail(message),
    phone: extractPhone(message),
    company: extractUpdatedCompany(message),
    notes: extractUpdatedNotes(message),
  }
}

export function looksLikeCreateClient(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(cliente)\b/.test(normalized) && /\b(crie|criar|novo|nova|cadastrar|cadastre|adicione|adicionar)\b/.test(normalized)) return true
  if (isClientsContext(context) && !!extractClientName(message, context)) return true
  return false
}

export function looksLikeCreateFinancial(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(gasto|despesa|ganho|receita|lancar|lance|registrar|registre|adicionar)\b/.test(normalized) && !!extractMoneyValue(message)) return true
  if (isFinancialContext(context) && !!extractMoneyValue(message)) return true
  return false
}

export function looksLikeCreateOperation(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(operacao|processo|projeto|ordem|viagem)\b/.test(normalized) && /\b(criar|crie|novo|nova|abrir|cadastrar|cadastre|iniciar|inicie)\b/.test(normalized)) return true
  if (isOperationsContext(context) && !!extractOperationTitle(message, context)) return true
  if (isOperationsContext(context) && !!extractOperationClientName(message)) return true
  return false
}

export function looksLikeCreateDocument(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(documento|contrato|proposta|relatorio|arquivo)\b/.test(normalized) && /\b(criar|crie|novo|nova)\b/.test(normalized)) return true
  if (isDocumentsContext(context) && !!extractDocumentTitle(message, context)) return true
  return false
}

export function looksLikeCreateMeeting(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(reuniao|gravar reuniao)\b/.test(normalized) && /\b(criar|crie|nova|novo|gravar)\b/.test(normalized)) return true
  if (isMeetingsContext(context) && !!extractMeetingTitle(message, context)) return true
  return false
}

export function looksLikeCreateSupportTicket(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(chamado|suporte|ajuda|problema|cobranca|atendimento)\b/.test(normalized)) return true
  return isSupportContext(context)
}

export function looksLikeUpdateClient(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)

  if (!hasClientUpdateField(message)) {
    return false
  }

  if (/\b(mude|altere|atualize|troque)\b/.test(normalized) && hasClientReference(message)) {
    return true
  }

  if (/\b(adicione|adicione o|adicione a|cadastre|registre)\b/.test(normalized) && hasClientReference(message)) {
    return true
  }

  if (isClientsContext(context) && hasClientReference(message)) {
    return true
  }

  return false
}
