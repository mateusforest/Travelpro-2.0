type QueryError = { message: string } | null

type LogAiUsageInput = {
  adminClient?: {
    from: (table: string) => unknown
  } | null
  workspaceId?: string | null
  userId?: string | null
  feature?: string | null
  provider?: string | null
  model?: string | null
  intent?: string | null
  source?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  latencyMs?: number | null
  success?: boolean | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

function buildUsagePayloads(input: Required<Pick<LogAiUsageInput, "workspaceId" | "userId" | "model">> & LogAiUsageInput) {
  const sharedMetadata = {
    ...(input.metadata ?? {}),
    feature: input.feature ?? "operations_engine_intent",
    provider: input.provider ?? "openai",
    success: input.success ?? true,
    errorMessage: input.errorMessage ?? null,
  }

  return [
    {
      workspace_id: input.workspaceId,
      user_id: input.userId,
      feature: input.feature ?? "operations_engine_intent",
      provider: input.provider ?? "openai",
      model: input.model,
      intent: input.intent ?? null,
      source: input.source ?? null,
      prompt_tokens: input.promptTokens ?? null,
      completion_tokens: input.completionTokens ?? null,
      total_tokens: input.totalTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      success: input.success ?? true,
      error_message: input.errorMessage ?? null,
      metadata: sharedMetadata,
    },
    {
      workspace_id: input.workspaceId,
      user_id: input.userId,
      model: input.model,
      intent: input.intent ?? null,
      source: input.source ?? null,
      prompt_tokens: input.promptTokens ?? null,
      completion_tokens: input.completionTokens ?? null,
      total_tokens: input.totalTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      metadata: sharedMetadata,
    },
    {
      workspace_id: input.workspaceId,
      user_id: input.userId,
      total_tokens: input.totalTokens ?? null,
      metadata: sharedMetadata,
    },
  ]
}

export async function logAiUsage(input: LogAiUsageInput) {
  if (!input.adminClient || !input.workspaceId || !input.userId || !input.model) {
    return { logged: false as const }
  }

  const usageTable = input.adminClient.from("ai_usage_logs") as {
    insert: (value: Record<string, unknown>) => Promise<unknown>
  }

  const payloads = buildUsagePayloads({
    ...input,
    workspaceId: input.workspaceId,
    userId: input.userId,
    model: input.model,
  })

  let lastError: string | null = null

  for (const payload of payloads) {
    const { error } = (await usageTable.insert(payload)) as { error: QueryError }
    if (!error) {
      return { logged: true as const }
    }

    lastError = error.message
  }

  if (lastError) {
    console.error("[operations-engine] ai-usage:", lastError)
  }

  return { logged: false as const, error: lastError ?? "Nao foi possivel registrar o uso de IA." }
}
