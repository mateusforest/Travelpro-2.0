import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import type { DetectedIntent } from "@/lib/cos-engine/types"

const areaTitles: Record<string, string> = {
  general: "Geral",
  cadastros: "Cadastros",
  clientes: "Clientes",
  leads: "Leads",
  produtos: "Produtos",
  servicos: "Servicos",
  financeiro: "Financeiro",
  ganhos: "Ganhos",
  gastos: "Gastos",
  "fluxo de caixa": "Fluxo de caixa",
  operacoes: "Operacoes",
  projetos: "Projetos",
  ordens: "Ordens",
  processos: "Processos",
  vendas: "Vendas",
  propostas: "Propostas",
  negociacoes: "Negociacoes",
  documentos: "Documentos",
  contratos: "Contratos",
  arquivos: "Arquivos",
  relatorios: "Relatorios",
  reunioes: "Reunioes",
  suporte: "Suporte",
  sistema: "Sistema",
}

function humanizeSegment(value: string) {
  const cleaned = value.replace(/-/g, " ").trim()

  if (!cleaned) {
    return "Geral"
  }

  if (areaTitles[cleaned]) {
    return areaTitles[cleaned]
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function buildOperationsConversationArea(input: { area?: string; subArea?: string }) {
  const context = buildOperationsContext(input)

  if (!context.area) {
    return "general"
  }

  if (!context.subArea) {
    return context.area
  }

  return `${context.area}/${context.subArea}`
}

export function inferOperationsConversationAreaFromIntent(detected: DetectedIntent) {
  if (detected.area && detected.entityType) {
    if (detected.area === "cadastros" && detected.entityType === "client") return "cadastros/clientes"
    if (detected.area === "cadastros" && detected.entityType === "lead") return "cadastros/leads"
    if (detected.area === "cadastros" && detected.entityType === "product") return "cadastros/produtos"
    if (detected.area === "cadastros" && detected.entityType === "service") return "cadastros/servicos"
    if (detected.area === "operacoes" && detected.entityType === "project") return "operacoes/projetos"
    if (detected.area === "operacoes" && detected.entityType === "order") return "operacoes/ordens"
    if (detected.area === "operacoes" && detected.entityType === "process") return "operacoes/processos"
    if (detected.area === "operacoes" && detected.entityType === "task") return "operacoes"
    if (detected.area === "vendas" && detected.entityType === "proposal") return "vendas/propostas"
    if (detected.area === "vendas" && detected.entityType === "negotiation") return "vendas/negociacoes"
    if (detected.area === "vendas" && detected.entityType === "marketing_action") return "vendas"
    if (detected.area === "financeiro" && detected.entityType === "income") return "financeiro/ganhos"
    if (detected.area === "financeiro" && detected.entityType === "expense") return "financeiro/gastos"
    if (detected.area === "documentos" && detected.entityType === "contract") return "documentos/contratos"
    if (detected.area === "documentos" && detected.entityType === "file") return "documentos/arquivos"
    if (detected.area === "documentos" && detected.entityType === "form") return "documentos"
    if (detected.area === "documentos" && detected.entityType === "report") return "documentos/relatorios"
    return detected.area
  }

  switch (detected.intent) {
    case "create_client":
    case "update_client":
    case "get_clients_count":
      return "cadastros/clientes"
    case "create_financial_income":
      return "financeiro/ganhos"
    case "create_financial_expense":
      return "financeiro/gastos"
    case "get_financial_summary":
      return "financeiro"
    case "create_operation":
      return "operacoes/projetos"
    case "create_document": {
      const type = String(detected.entities.type || "").trim().toLowerCase()

      if (type === "contrato") {
        return "documentos/contratos"
      }

      if (type === "relatorio" || type === "relatório") {
        return "documentos/relatorios"
      }

      if (type === "arquivo") {
        return "documentos/arquivos"
      }

      return "documentos"
    }
    case "create_meeting":
      return "reunioes"
    case "create_support_ticket":
      return "suporte"
    case "get_recent_activity":
    case "unknown":
    default:
      return "general"
  }
}

export function buildOperationsConversationTitle(input: { area?: string; subArea?: string }) {
  const conversationArea = buildOperationsConversationArea(input)
  const segments = conversationArea.split("/")
  const lastSegment = segments[segments.length - 1] || "general"

  return humanizeSegment(lastSegment)
}

export function formatOperationsConversationTime(value: string | null) {
  if (!value) {
    return "Agora"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
