import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import { detectOperationsIntent } from "@/lib/cos-engine/operations-intents"
import {
  buildResolvedIntentFromDetected,
  createEmptyIntentEntities,
  extractUsageFromOpenAiResponse,
  futureMinimumIntentConfidence,
  isAllowedOperationsIntent,
  normalizeResolvedIntent,
  operationsOpenAiJsonSchema,
  operationsOpenAiModel,
  operationsOpenAiResponseSchema,
  operationsOpenAiTimeoutMs,
} from "@/lib/cos-engine/schemas"
import { buildIntakePromptSummary } from "@/lib/cos-engine/file-intake"
import { intakeQuickActionRegistry } from "@/lib/cos-engine/intake-registry"
import { summarizeOperationalModelForPrompt } from "@/lib/cos-engine/operational-model"
import type {
  OperationsConversationMemory,
  OperationsEngineContext,
  OperationsEngineInput,
  OperationsIntentResolution,
  OperationsResolvedIntent,
} from "@/lib/cos-engine/types"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

const operationsSystemPrompt = [
  "Voce e o resolvedor de intencao do COS, um software operacional conversacional.",
  "Sua unica funcao e interpretar a mensagem do usuario e responder somente JSON valido.",
  "O COS organiza o sistema em areas como cadastros, operacoes, vendas, financeiro, equipe, documentos, reunioes, suporte e sistema.",
  "Sempre tente identificar area, entityType e actionType.",
  "O COS tambem entende intake de arquivos, fotos, documentos anexados e acoes do modal +.",
  "Quando o usuario disser ele, ela, dele, dela, esse, essa, este, esta, o mesmo, a mesma, ultimo ou ultima, considere lastEntity como alvo provavel.",
  "Quando a referencia mencionar um tipo especifico como esse gasto, esse chamado, esse documento ou essa reuniao, priorize a entidade recente desse tipo.",
  "Se o alvo estiver ambiguo ou ausente, use clarificationQuestion e nao invente a execucao.",
  "Voce pode classificar intakeType, documentType, extractedEntityTypes e suggestedActions, mas nunca deve dizer que salvou ou enviou algo.",
  "Se for intake de arquivo, foto ou documento, a resposta deve priorizar preview, confirmacao e acoes assistidas.",
  "Nenhum dado extraido pode ser salvo automaticamente.",
  "Envio externo por email ou WhatsApp nunca deve executar automaticamente e deve exigir confirmacao e integracao ativa.",
  "Nunca diga que executou uma acao.",
  "Nunca confirme criacao, edicao ou exclusao.",
  "Nunca invente IDs, clientes existentes, valores, datas ou resultados.",
  "Para create_client, apenas o nome e obrigatorio. Email e telefone sao opcionais.",
  "Para update_client, so sao permitidos os campos name, email, phone, company e notes.",
  "Para update_client, use clientId apenas se ele estiver presente no contexto fornecido. Caso contrario, use clientName ou missingFields.",
  "Para create_financial_income e create_financial_expense, amount e title sao obrigatorios.",
  "Para create_document, o campo title e obrigatorio.",
  "Quando a intencao for compreensivel mas a execucao ainda nao existir, use intent unknown e preencha area, entityType, actionType e unsupportedReason.",
  "Se o pedido envolver arquivo, contrato, foto, documento, extracao ou envio externo, voce pode manter intent unknown e retornar metadata estruturada de intake.",
  "Edicao segura de cliente e permitida apenas via intent update_client.",
  "Pedidos de exclusao, transferencia, pagamento, envio de mensagem ou integracao externa devem virar intent unknown com unsafeReason.",
  "Se faltar dado obrigatorio, preencha missingFields corretamente.",
  "Se estiver ambiguo ou inseguro, reduza confidence e use missingFields ou unsafeReason.",
  "Se nao tiver certeza suficiente, use shouldFallbackToHeuristic true.",
  "Use apenas intents permitidas.",
  "Nao retorne markdown, comentarios, texto adicional ou blocos de codigo.",
].join(" ")

function shouldPreferHeuristicIntent(input: {
  resolvedIntent: OperationsResolvedIntent
  message: string
  heuristicIntent: ReturnType<typeof detectOperationsIntent>
}) {
  if (input.resolvedIntent.intent !== "create_client") {
    return false
  }

  if (
    ![
      "create_operation",
      "create_document",
      "create_financial_income",
      "create_financial_expense",
      "create_meeting",
      "create_support_ticket",
      "update_client",
    ].includes(input.heuristicIntent.intent)
  ) {
    return false
  }

  const normalizedMessage = input.message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  return /\b(viagem|operacao|processo|projeto|ordem|documento|contrato|proposta|relatorio|arquivo|reuniao|gasto|despesa|receita|ganho|chamado|suporte)\b/.test(
    normalizedMessage,
  )
}

function buildFallbackResolution(
  message: string,
  context: OperationsEngineContext,
  conversationMemory: OperationsConversationMemory | undefined,
  fallbackReason: OperationsIntentResolution["fallbackReason"],
  input?: Partial<Pick<OperationsIntentResolution, "model" | "latencyMs" | "errorMessage" | "usage">> & {
    fileName?: string | null
    fileMimeType?: string | null
  },
): OperationsIntentResolution {
  const detectedIntent = detectOperationsIntent(message, context, conversationMemory, {
    fileName: input?.fileName ?? null,
    fileMimeType: input?.fileMimeType ?? null,
  })

  return {
    resolvedIntent: buildResolvedIntentFromDetected(detectedIntent, "fallback"),
    model: input?.model ?? null,
    latencyMs: input?.latencyMs ?? null,
    fallbackUsed: true,
    fallbackReason,
    usage: input?.usage,
    errorMessage: input?.errorMessage ?? null,
  }
}

function buildUserPrompt(
  message: string,
  context: OperationsEngineContext,
  conversationMemory?: OperationsConversationMemory,
  attachment?: { fileName?: string; fileMimeType?: string },
) {
  return JSON.stringify(
    {
      task: "Interpretar a intencao operacional do usuario para o COS.",
      allowedIntents: [
        "create_client",
        "update_client",
        "create_financial_income",
        "create_financial_expense",
        "create_operation",
        "create_document",
        "create_meeting",
        "create_support_ticket",
        "get_clients_count",
        "get_financial_summary",
        "get_recent_activity",
        "unknown",
      ],
      context: {
        area: context.area || null,
        subArea: context.subArea || null,
        conversationMemory: conversationMemory
          ? {
              lastSuccessfulAction: conversationMemory.lastSuccessfulAction,
              lastResultId: conversationMemory.lastResultId,
              lastClient: conversationMemory.lastClient,
              lastEntity: conversationMemory.lastEntity,
              lastEntityType: conversationMemory.lastEntityType,
              lastEntityArea: conversationMemory.lastEntityArea,
              recentEntities: conversationMemory.recentEntities,
              lastEntities: conversationMemory.lastEntities,
            }
          : null,
      },
      message,
      attachment: {
        fileName: attachment?.fileName ?? null,
        fileMimeType: attachment?.fileMimeType ?? null,
      },
      requiredEntityKeys: Object.keys(createEmptyIntentEntities()),
      operationalModel: summarizeOperationalModelForPrompt(),
      intakeModel: {
        quickActions: Object.entries(intakeQuickActionRegistry).map(([key, value]) => ({
          key,
          ...value,
        })),
        promptHints: buildIntakePromptSummary({
          intakeType: null,
          documentType: null,
        }),
      },
      guidance: {
        create_client: ["name"],
        update_client: ["clientId_or_clientName", "one_or_more_of_name_email_phone_company_notes"],
        create_financial_income: ["amount", "title"],
        create_financial_expense: ["amount", "title"],
        create_operation: ["title"],
        create_document: ["title"],
        create_meeting: ["title"],
        create_support_ticket: ["subject", "description"],
        unknown: ["area", "entityType", "actionType", "unsupportedReason_or_clarificationQuestion_when_applicable"],
        intake: [
          "intakeType",
          "documentType",
          "extractedEntityTypes",
          "suggestedActions",
          "requiresConfirmation",
          "externalSendIntent",
          "externalSendBlockedReason",
        ],
      },
    },
    null,
    2,
  )
}

function tryReadOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const record = payload as Record<string, unknown>
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text
  }

  const output = Array.isArray(record.output) ? record.output : []
  for (const item of output) {
    if (!item || typeof item !== "object") continue
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : []

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue
      const text = (contentItem as Record<string, unknown>).text
      if (typeof text === "string" && text.trim()) {
        return text
      }
    }
  }

  return null
}

function parseResolvedIntentPayload(payloadText: string): OperationsResolvedIntent | null {
  try {
    const parsed = JSON.parse(payloadText)
    const result = operationsOpenAiResponseSchema.safeParse(parsed)

    if (!result.success) {
      return null
    }

    if (!isAllowedOperationsIntent(result.data.intent)) {
      return null
    }

    return normalizeResolvedIntent(result.data)
  } catch {
    return null
  }
}

export function isOperationsOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function resolveOperationsIntent(input: OperationsEngineInput): Promise<OperationsIntentResolution> {
  const message = input.message.trim()
  const context = buildOperationsContext(input)
  const conversationMemory = input.conversationMemory

  if (!isOperationsOpenAiConfigured()) {
    return buildFallbackResolution(message, context, conversationMemory, "openai_not_configured", {
      fileName: input.fileName ?? null,
      fileMimeType: input.fileMimeType ?? null,
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), operationsOpenAiTimeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: operationsOpenAiModel,
        temperature: 0,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: operationsSystemPrompt }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildUserPrompt(message, context, conversationMemory, {
                  fileName: input.fileName,
                  fileMimeType: input.fileMimeType,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            ...operationsOpenAiJsonSchema,
          },
        },
      }),
    })

    const latencyMs = Date.now() - startedAt
    const payload = (await response.json()) as Record<string, unknown>
    const usage = extractUsageFromOpenAiResponse(payload.usage)

    if (!response.ok) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_request_failed", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
        errorMessage:
          typeof payload.error === "object" &&
          payload.error &&
          typeof (payload.error as Record<string, unknown>).message === "string"
            ? ((payload.error as Record<string, unknown>).message as string)
            : `OpenAI request failed with status ${response.status}.`,
      })
    }

    const outputText = tryReadOutputText(payload)
    if (!outputText) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_invalid_json", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
        errorMessage: "OpenAI nao retornou output_text valido.",
      })
    }

    const resolvedIntent = parseResolvedIntentPayload(outputText)
    if (!resolvedIntent) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_invalid_schema", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
        errorMessage: "OpenAI retornou JSON fora do contrato esperado.",
      })
    }

    const heuristicIntent = detectOperationsIntent(message, context, conversationMemory, {
      fileName: input.fileName ?? null,
      fileMimeType: input.fileMimeType ?? null,
    })

    if (
      shouldPreferHeuristicIntent({
        resolvedIntent,
        message,
        heuristicIntent,
      })
    ) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_requested_fallback", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
      })
    }

    if (resolvedIntent.shouldFallbackToHeuristic) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_requested_fallback", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
      })
    }

    if (!isAllowedOperationsIntent(resolvedIntent.intent)) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_unknown_intent", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
      })
    }

    if (
      resolvedIntent.intent === "unknown" &&
      !resolvedIntent.area &&
      !resolvedIntent.entityType &&
      !resolvedIntent.actionType &&
      !resolvedIntent.clarificationQuestion
    ) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_unknown_intent", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
      })
    }

    if (resolvedIntent.confidence < futureMinimumIntentConfidence) {
      return buildFallbackResolution(message, context, conversationMemory, "openai_low_confidence", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
      })
    }

    return {
      resolvedIntent,
      model: operationsOpenAiModel,
      latencyMs,
      fallbackUsed: false,
      fallbackReason: null,
      usage,
      errorMessage: null,
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const errorMessage = error instanceof Error ? error.message : "Falha desconhecida na OpenAI."

    if (error instanceof Error && error.name === "AbortError") {
      return buildFallbackResolution(message, context, conversationMemory, "openai_timeout", {
        model: operationsOpenAiModel,
        latencyMs,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
        errorMessage,
      })
    }

    return buildFallbackResolution(message, context, conversationMemory, "openai_request_failed", {
      model: operationsOpenAiModel,
      latencyMs,
      fileName: input.fileName ?? null,
      fileMimeType: input.fileMimeType ?? null,
      errorMessage,
    })
  } finally {
    clearTimeout(timeout)
  }
}
