import { humanizeActivityAction } from "@/lib/activity/humanize"
import type { OperationsEngineResult } from "@/lib/cos-engine/types"

export { humanizeActivityAction }

export function formatCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function buildEngineError(message: string, action?: OperationsEngineResult["action"]): OperationsEngineResult {
  return {
    ok: false,
    message,
    action,
    error: message,
    executionStatus: "failed",
  }
}

export function buildEngineSuccess(input: Omit<OperationsEngineResult, "ok" | "executionStatus">): OperationsEngineResult {
  return {
    ok: true,
    executionStatus: "executed",
    ...input,
  }
}
