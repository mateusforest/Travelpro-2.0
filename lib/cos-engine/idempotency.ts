import { createHash } from "node:crypto"
import { isSideEffectIntent } from "@/lib/cos-engine/schemas"
import type { OperationsEngineResult, OperationsResolvedIntent } from "@/lib/cos-engine/types"

type MessageRow = {
  id: string
  content: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export function normalizeMessageForIdempotency(message: string) {
  return message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

export function buildOperationsIdempotencyKey(input: {
  workspaceId: string
  userId: string
  message: string
  area: string
  intent: string
}) {
  const raw = [
    input.workspaceId,
    input.userId,
    input.area,
    input.intent,
    normalizeMessageForIdempotency(input.message),
  ].join(":")

  return createHash("sha256").update(raw).digest("hex")
}

export function shouldApplyIdempotency(intent: OperationsResolvedIntent["intent"]) {
  return isSideEffectIntent(intent)
}

export async function findRecentDuplicateExecution(input: {
  adminClient: {
    from: (table: string) => unknown
  }
  conversationId: string
  idempotencyKey: string
  resolvedIntent: OperationsResolvedIntent
}): Promise<OperationsEngineResult | null> {
  if (!shouldApplyIdempotency(input.resolvedIntent.intent)) {
    return null
  }

  const messagesTable = input.adminClient.from("ai_messages") as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (value: number) => unknown
        }
      }
    }
  }

  const { data, error } = (await messagesTable
    .select("id, content, metadata, created_at")
    .eq("conversation_id", input.conversationId)
    .order("created_at", { ascending: false })
    .limit(12)) as { data: MessageRow[] | null; error: { message: string } | null }

  if (error || !data?.length) {
    return null
  }

  const duplicate = data.find((row) => {
    const metadata = row.metadata ?? {}
    return (
      metadata.idempotencyKey === input.idempotencyKey &&
      metadata.executionStatus === "executed" &&
      metadata.action === input.resolvedIntent.intent
    )
  })

  if (!duplicate) {
    return null
  }

  const metadata = duplicate.metadata ?? {}
  return {
    ok: true,
    action: input.resolvedIntent.intent,
    resultId: typeof metadata.resultId === "string" ? metadata.resultId : undefined,
    message: duplicate.content || "Esta solicitacao ja foi executada recentemente.",
    suggestedLabel: typeof metadata.suggestedLabel === "string" ? metadata.suggestedLabel : undefined,
    suggestedHref: typeof metadata.suggestedHref === "string" ? metadata.suggestedHref : undefined,
    executionStatus: "duplicate_prevented",
  }
}
