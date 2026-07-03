import type { OperationalActionType } from "@/lib/cos-engine/action-registry"
import type { OperationalEntityType } from "@/lib/cos-engine/entity-fields"

export type OperationsIntakeType =
  | "file"
  | "photo"
  | "document"
  | "pasted_text"
  | "spreadsheet"
  | "audio"
  | "unknown"

export type OperationsDocumentType =
  | "contract"
  | "proposal"
  | "report"
  | "receipt"
  | "invoice"
  | "financial_spreadsheet"
  | "client_list"
  | "form"
  | "image_with_data"
  | "unknown_document"

export const operationsIntakeTypeValues: OperationsIntakeType[] = [
  "file",
  "photo",
  "document",
  "pasted_text",
  "spreadsheet",
  "audio",
  "unknown",
]

export const operationsDocumentTypeValues: OperationsDocumentType[] = [
  "contract",
  "proposal",
  "report",
  "receipt",
  "invoice",
  "financial_spreadsheet",
  "client_list",
  "form",
  "image_with_data",
  "unknown_document",
]

export type IntakeQuickActionKey =
  | "cliente"
  | "operacao"
  | "contrato"
  | "financeiro"
  | "reuniao"
  | "equipe"
  | "arquivo"
  | "foto"
  | "documento"
  | "tarefa"
  | "relatorio"
  | "formulario"
  | "marketing"
  | "integracao"
  | "suporte"

export type IntakeQuickActionDefinition = {
  label: string
  entityType: OperationalEntityType
  actionType: OperationalActionType
  intakeType?: OperationsIntakeType | null
  documentType?: OperationsDocumentType | null
  status: "executable" | "unsupported_external_action"
  notes?: string
}

export const intakeQuickActionRegistry: Record<IntakeQuickActionKey, IntakeQuickActionDefinition> = {
  cliente: { label: "Cliente", entityType: "client", actionType: "create", status: "executable" },
  operacao: { label: "Operacao", entityType: "project", actionType: "create", status: "executable" },
  contrato: { label: "Contrato", entityType: "contract", actionType: "generate", intakeType: "document", documentType: "contract", status: "unsupported_external_action" },
  financeiro: { label: "Financeiro", entityType: "cash_flow", actionType: "register", status: "executable" },
  reuniao: { label: "Reuniao", entityType: "meeting", actionType: "create", status: "executable" },
  equipe: { label: "Equipe", entityType: "member", actionType: "create", status: "unsupported_external_action" },
  arquivo: { label: "Arquivo", entityType: "file", actionType: "create", intakeType: "file", documentType: "unknown_document", status: "unsupported_external_action" },
  foto: { label: "Foto", entityType: "file", actionType: "create", intakeType: "photo", documentType: "image_with_data", status: "unsupported_external_action" },
  documento: { label: "Documento", entityType: "document", actionType: "generate", intakeType: "document", documentType: "unknown_document", status: "executable" },
  tarefa: { label: "Tarefa", entityType: "task", actionType: "create", status: "unsupported_external_action", notes: "acao externa pendente" },
  relatorio: { label: "Relatorio", entityType: "report", actionType: "generate", intakeType: "document", documentType: "report", status: "unsupported_external_action" },
  formulario: { label: "Formulario", entityType: "form", actionType: "generate", intakeType: "document", documentType: "form", status: "unsupported_external_action", notes: "acao externa pendente" },
  marketing: { label: "Marketing", entityType: "marketing_action", actionType: "create", status: "unsupported_external_action", notes: "acao externa pendente" },
  integracao: { label: "Integracao", entityType: "integration", actionType: "open", status: "unsupported_external_action" },
  suporte: { label: "Suporte", entityType: "ticket", actionType: "open", status: "executable" },
}

export const intakeMimeTypeRegistry = {
  pdf: ["application/pdf"],
  document: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  spreadsheet: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  image: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic"],
  text: ["text/plain", "text/markdown"],
} as const

export const documentTypeAliases: Record<OperationsDocumentType, string[]> = {
  contract: ["contrato", "locacao", "locação", "prestacao de servico", "prestação de serviço"],
  proposal: ["proposta", "orcamento", "orçamento", "proposta comercial"],
  report: ["relatorio", "relatório", "resumo", "analise"],
  receipt: ["comprovante", "recibo"],
  invoice: ["nota fiscal", "nfe", "nf", "fatura"],
  financial_spreadsheet: ["planilha financeira", "planilha", "xlsx", "csv", "fluxo de caixa"],
  client_list: ["lista de clientes", "base de clientes", "cadastro de clientes"],
  form: ["formulario", "formulário", "questionario", "questionário"],
  image_with_data: ["foto", "imagem", "print", "captura"],
  unknown_document: ["arquivo", "documento", "anexo"],
}

export function normalizeIntakeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function inferDocumentTypeFromText(message: string): OperationsDocumentType {
  const normalized = normalizeIntakeText(message)

  for (const [documentType, aliases] of Object.entries(documentTypeAliases) as Array<[OperationsDocumentType, string[]]>) {
    if (aliases.some((alias) => normalized.includes(normalizeIntakeText(alias)))) {
      return documentType
    }
  }

  return "unknown_document"
}

export function inferIntakeTypeFromMessage(message: string, fileMimeType?: string | null): OperationsIntakeType {
  const normalized = normalizeIntakeText(message)
  const mime = normalizeIntakeText(fileMimeType || "")

  if (mime && intakeMimeTypeRegistry.image.some((entry) => entry === mime)) return "photo"
  if (mime && intakeMimeTypeRegistry.pdf.some((entry) => entry === mime)) return "document"
  if (mime && intakeMimeTypeRegistry.document.some((entry) => entry === mime)) return "document"
  if (mime && intakeMimeTypeRegistry.spreadsheet.some((entry) => entry === mime)) return "spreadsheet"
  if (/\b(foto|imagem|print|anexar uma foto|tirar foto)\b/.test(normalized)) return "photo"
  if (/\b(pdf|docx|doc|documento|contrato|proposta|arquivo|anexo)\b/.test(normalized)) return "document"
  if (/\b(planilha|xlsx|csv)\b/.test(normalized)) return "spreadsheet"
  if (/\b(texto colado|colar texto|colei o texto)\b/.test(normalized)) return "pasted_text"
  if (/\b(audio|gravacao|gravacao de audio)\b/.test(normalized)) return "audio"

  return "unknown"
}

export function findQuickActionByLabel(label: string) {
  const normalized = normalizeIntakeText(label)

  return Object.values(intakeQuickActionRegistry).find((entry) => normalizeIntakeText(entry.label) === normalized) ?? null
}

