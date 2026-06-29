import type { OperationsEngineContext } from "@/lib/cos-engine/types"

function normalizeSegment(value?: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function buildOperationsContext(input: { area?: string; subArea?: string }): OperationsEngineContext {
  return {
    area: normalizeSegment(input.area),
    subArea: normalizeSegment(input.subArea),
  }
}

export function isClientsContext(context: OperationsEngineContext) {
  return context.area === "cadastros" || context.subArea === "clientes"
}

export function isFinancialContext(context: OperationsEngineContext) {
  return context.area === "financeiro"
}

export function isOperationsContext(context: OperationsEngineContext) {
  return context.area === "operacoes"
}

export function isDocumentsContext(context: OperationsEngineContext) {
  return context.area === "documentos"
}

export function isMeetingsContext(context: OperationsEngineContext) {
  return context.area === "reunioes"
}

export function isSupportContext(context: OperationsEngineContext) {
  return context.area === "suporte"
}
