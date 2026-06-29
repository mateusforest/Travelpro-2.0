import type {
  DetectedIntent,
  OperationsEngineIntent,
  OperationsIntentUsage,
  OperationsResolvedIntent,
  OperationsIntentSource,
} from "@/lib/cos-engine/types"
import type { AssistedActionSuggestion } from "@/lib/cos-engine/assisted-actions"
import {
  operationalActionTypeValues,
  type OperationalActionType,
} from "@/lib/cos-engine/action-registry"
import {
  operationalAreaValues,
  type OperationalArea,
} from "@/lib/cos-engine/entity-registry"
import {
  operationalEntityTypeValues,
  type OperationalEntityType,
} from "@/lib/cos-engine/entity-fields"
import {
  operationsDocumentTypeValues,
  operationsIntakeTypeValues,
  type OperationsDocumentType,
  type OperationsIntakeType,
} from "@/lib/cos-engine/intake-registry"
import { z } from "zod"

export const operationsIntentValues = [
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
] as const

export const operationsIntentEntityKeys = [
  "name",
  "email",
  "phone",
  "company",
  "notes",
  "amount",
  "description",
  "title",
  "category",
  "date",
  "clientId",
  "clientName",
  "documentType",
  "type",
  "subject",
  "client",
  "value",
  "priority",
  "status",
  "role",
  "department",
  "period",
  "stage",
  "responsible",
  "participants",
  "severity",
  "source",
  "sku",
  "url",
  "fileName",
  "fileMimeType",
] as const

const defaultReplies: Record<OperationsEngineIntent, string> = {
  create_client: "Vou criar esse cliente para voce.",
  update_client: "Vou atualizar esse cliente para voce.",
  create_financial_income: "Vou registrar essa receita para voce.",
  create_financial_expense: "Vou registrar esse gasto para voce.",
  create_operation: "Vou criar essa operacao para voce.",
  create_document: "Vou criar esse documento para voce.",
  create_meeting: "Vou criar essa reuniao para voce.",
  create_support_ticket: "Vou abrir esse chamado para voce.",
  get_clients_count: "Vou consultar seus clientes.",
  get_financial_summary: "Vou consultar seu resumo financeiro.",
  get_recent_activity: "Vou consultar suas ultimas atividades.",
  unknown: "Ainda nao consegui interpretar essa solicitacao com seguranca.",
}

const requiredFieldsByIntent: Partial<Record<OperationsEngineIntent, string[]>> = {
  create_client: ["name"],
  create_financial_income: ["amount", "title"],
  create_financial_expense: ["amount", "title"],
  create_operation: ["title"],
  create_document: ["title"],
  create_meeting: ["title"],
  create_support_ticket: ["subject", "description"],
}

export const futureMinimumIntentConfidence = 0.55
export const operationsOpenAiModel = process.env.OPENAI_OPERATIONS_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini"
export const operationsOpenAiTimeoutMs = 10000

const nullableEntityValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

function normalizeOperationalArea(value: string | null | undefined): OperationalArea | null {
  return value && operationalAreaValues.includes(value as OperationalArea) ? (value as OperationalArea) : null
}

function normalizeOperationalEntityType(value: string | null | undefined): OperationalEntityType | null {
  return value && operationalEntityTypeValues.includes(value as OperationalEntityType)
    ? (value as OperationalEntityType)
    : null
}

function normalizeOperationalActionType(value: string | null | undefined): OperationalActionType | null {
  return value && operationalActionTypeValues.includes(value as OperationalActionType)
    ? (value as OperationalActionType)
    : null
}

function normalizeIntakeType(value: string | null | undefined) {
  return value && operationsIntakeTypeValues.includes(value as OperationsIntakeType) ? (value as OperationsIntakeType) : null
}

function normalizeDocumentType(value: string | null | undefined) {
  return value && operationsDocumentTypeValues.includes(value as OperationsDocumentType)
    ? (value as OperationsDocumentType)
    : null
}

function normalizeExtractionStatus(value: string | null | undefined) {
  return value && ["awaiting_file", "classified_only", "preview_ready", "needs_review"].includes(value)
    ? (value as "awaiting_file" | "classified_only" | "preview_ready" | "needs_review")
    : null
}

function normalizeSuggestedActions(value: unknown): AssistedActionSuggestion[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return []
    }

    const record = item as Record<string, unknown>
    const actionType = typeof record.actionType === "string" ? normalizeOperationalActionType(record.actionType) : null
    const entityType = typeof record.entityType === "string" ? normalizeOperationalEntityType(record.entityType) : null
    const label = typeof record.label === "string" ? record.label.trim() : ""
    const confidence = typeof record.confidence === "number" ? Math.max(0, Math.min(1, record.confidence)) : 0
    const requiresConfirmation = record.requiresConfirmation === true
    const status =
      record.status === "executable" || record.status === "unsupported_connected_action" || record.status === "blocked"
        ? record.status
        : "blocked"
    const missingFields = Array.isArray(record.missingFields)
      ? record.missingFields.filter((field): field is string => typeof field === "string" && field.trim().length > 0)
      : []
    const extractedFields =
      record.extractedFields && typeof record.extractedFields === "object" && !Array.isArray(record.extractedFields)
        ? (record.extractedFields as Record<string, string | number | boolean | null | undefined>)
        : {}

    if (!label || !actionType || !requiresConfirmation) {
      return []
    }

    return [
      {
        label,
        actionType,
        entityType,
        extractedFields,
        missingFields,
        confidence,
        requiresConfirmation: true,
        status,
      } satisfies AssistedActionSuggestion,
    ]
  })
}

function normalizeResolvedEntity(value: unknown): OperationsResolvedIntent["resolvedEntity"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const name = typeof record.name === "string" ? record.name.trim() : ""

  if (!name) {
    return null
  }

  return {
    id: typeof record.id === "string" ? record.id : null,
    name,
    entityType: typeof record.entityType === "string" ? record.entityType : null,
    area: typeof record.area === "string" ? record.area : null,
    action: typeof record.action === "string" ? record.action : null,
    sourceIntent: typeof record.sourceIntent === "string" ? record.sourceIntent : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
    confidence: typeof record.confidence === "number" ? record.confidence : null,
    fields:
      record.fields && typeof record.fields === "object" && !Array.isArray(record.fields)
        ? (record.fields as Record<string, string | number | boolean | null | undefined>)
        : {},
  }
}

const assistedActionSchema = z.object({
  label: z.string(),
  actionType: z.string(),
  entityType: z.string().nullable(),
  extractedFields: z.record(z.string(), nullableEntityValueSchema),
  missingFields: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.literal(true),
  status: z.enum(["executable", "unsupported_connected_action", "blocked"]),
})

export const operationsResolvedIntentSchema = z.object({
  intent: z.enum(operationsIntentValues),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), nullableEntityValueSchema),
  requiresConfirmation: z.boolean(),
  missingFields: z.array(z.string()),
  unsafeReason: z.string().nullable(),
  reply: z.string(),
  shouldFallbackToHeuristic: z.boolean(),
  source: z.enum(["heuristic", "openai", "fallback"]),
  area: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  actionType: z.string().nullable().optional(),
  clarificationQuestion: z.string().nullable().optional(),
  unsupportedReason: z.string().nullable().optional(),
  unresolvedReference: z.string().nullable().optional(),
  targetReference: z.string().nullable().optional(),
  resolvedFrom: z.enum(["lastEntity", "recentEntities"]).nullable().optional(),
  resolvedEntity: z
    .object({
      id: z.string().nullable().optional(),
      name: z.string(),
      entityType: z.string().nullable(),
      area: z.string().nullable(),
      action: z.string().nullable().optional(),
      sourceIntent: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional(),
      confidence: z.number().nullable().optional(),
      fields: z.record(z.string(), nullableEntityValueSchema),
    })
    .nullable()
    .optional(),
  intakeType: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  extractedEntityTypes: z.array(z.string()).optional(),
  suggestedActions: z.array(assistedActionSchema).optional(),
  extractionStatus: z.enum(["awaiting_file", "classified_only", "preview_ready", "needs_review"]).nullable().optional(),
  externalSendIntent: z.boolean().optional(),
  externalSendBlockedReason: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileMimeType: z.string().nullable().optional(),
  readFields: z.array(z.string()).optional(),
})

export const operationsOpenAiResponseSchema = operationsResolvedIntentSchema.extend({
  source: z.literal("openai"),
})

export const operationsOpenAiJsonSchema = {
  name: "operations_intent_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "intent",
      "confidence",
      "entities",
      "requiresConfirmation",
      "missingFields",
      "unsafeReason",
      "reply",
      "shouldFallbackToHeuristic",
      "source",
      "area",
      "entityType",
      "actionType",
      "clarificationQuestion",
      "unsupportedReason",
      "unresolvedReference",
      "targetReference",
      "resolvedFrom",
      "resolvedEntity",
      "intakeType",
      "documentType",
      "extractedEntityTypes",
      "suggestedActions",
      "extractionStatus",
      "externalSendIntent",
      "externalSendBlockedReason",
      "fileName",
      "fileMimeType",
    ],
    properties: {
      intent: {
        type: "string",
        enum: [...operationsIntentValues],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      entities: {
        type: "object",
        additionalProperties: false,
        required: [...operationsIntentEntityKeys],
        properties: Object.fromEntries(
          operationsIntentEntityKeys.map((key) => [
            key,
            {
              anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
            },
          ]),
        ),
      },
      requiresConfirmation: {
        type: "boolean",
      },
      missingFields: {
        type: "array",
        items: {
          type: "string",
        },
      },
      unsafeReason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      reply: {
        type: "string",
      },
      shouldFallbackToHeuristic: {
        type: "boolean",
      },
      source: {
        type: "string",
        enum: ["openai"],
      },
      area: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      entityType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      actionType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      clarificationQuestion: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      unsupportedReason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      unresolvedReference: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      targetReference: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      resolvedFrom: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      resolvedEntity: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "name", "entityType", "area", "action", "sourceIntent", "createdAt", "updatedAt", "confidence", "fields"],
            properties: {
              id: { anyOf: [{ type: "string" }, { type: "null" }] },
              name: { type: "string" },
              entityType: { anyOf: [{ type: "string" }, { type: "null" }] },
              area: { anyOf: [{ type: "string" }, { type: "null" }] },
              action: { anyOf: [{ type: "string" }, { type: "null" }] },
              sourceIntent: { anyOf: [{ type: "string" }, { type: "null" }] },
              createdAt: { anyOf: [{ type: "string" }, { type: "null" }] },
              updatedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
              confidence: { anyOf: [{ type: "number" }, { type: "null" }] },
              fields: {
                type: "object",
                additionalProperties: {
                  anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
                },
              },
            },
          },
          { type: "null" },
        ],
      },
      intakeType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      documentType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      extractedEntityTypes: {
        type: "array",
        items: {
          type: "string",
        },
      },
      suggestedActions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "label",
            "actionType",
            "entityType",
            "extractedFields",
            "missingFields",
            "confidence",
            "requiresConfirmation",
            "status",
          ],
          properties: {
            label: { type: "string" },
            actionType: { type: "string" },
            entityType: { anyOf: [{ type: "string" }, { type: "null" }] },
            extractedFields: {
              type: "object",
              additionalProperties: {
                anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
              },
            },
            missingFields: {
              type: "array",
              items: { type: "string" },
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            requiresConfirmation: {
              type: "boolean",
            },
            status: {
              type: "string",
              enum: ["executable", "unsupported_connected_action", "blocked"],
            },
          },
        },
      },
      extractionStatus: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      externalSendIntent: {
        type: "boolean",
      },
      externalSendBlockedReason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      fileName: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      fileMimeType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      readFields: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  },
} as const

export function getRequiredFieldsForIntent(intent: OperationsEngineIntent) {
  return requiredFieldsByIntent[intent] ?? []
}

export function isAllowedOperationsIntent(value: string): value is OperationsEngineIntent {
  return operationsIntentValues.includes(value as OperationsEngineIntent)
}

export function isSideEffectIntent(intent: OperationsEngineIntent) {
  return [
    "create_client",
    "update_client",
    "create_financial_income",
    "create_financial_expense",
    "create_operation",
    "create_document",
    "create_meeting",
    "create_support_ticket",
  ].includes(intent)
}

export function buildResolvedIntentFromDetected(
  detected: DetectedIntent,
  source: OperationsIntentSource = "heuristic",
): OperationsResolvedIntent {
  return {
    intent: detected.intent,
    confidence: detected.intent === "unknown" ? 0 : 1,
    entities: detected.entities,
    requiresConfirmation:
      (detected.suggestedActions?.length ?? 0) > 0 || detected.externalSendIntent === true,
    missingFields: [],
    unsafeReason: null,
    reply: defaultReplies[detected.intent] ?? defaultReplies.unknown,
    shouldFallbackToHeuristic: source !== "heuristic",
    source,
    area: detected.area ?? null,
    entityType: detected.entityType ?? null,
    actionType: detected.actionType ?? null,
    targetReference: detected.targetReference ?? null,
    clarificationQuestion: detected.clarificationQuestion ?? null,
    unsupportedReason: detected.unsupportedReason ?? null,
    unresolvedReference: detected.unresolvedReference ?? null,
    resolvedFrom: detected.resolvedFrom ?? null,
    resolvedEntity: detected.resolvedEntity ?? null,
    intakeType: detected.intakeType ?? null,
    documentType: detected.documentType ?? null,
    extractedEntityTypes: detected.extractedEntityTypes ?? [],
    suggestedActions: detected.suggestedActions ?? [],
    extractionStatus: detected.extractionStatus ?? null,
    externalSendIntent: detected.externalSendIntent ?? false,
    externalSendBlockedReason: detected.externalSendBlockedReason ?? null,
    fileName: detected.fileName ?? null,
    fileMimeType: detected.fileMimeType ?? null,
    readFields: detected.readFields ?? [],
  }
}

export function createEmptyIntentEntities() {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    notes: null,
    amount: null,
    description: null,
    title: null,
    category: null,
    date: null,
    clientId: null,
    clientName: null,
    documentType: null,
    type: null,
    subject: null,
    client: null,
    value: null,
    priority: null,
    status: null,
    role: null,
    department: null,
    period: null,
    stage: null,
    responsible: null,
    participants: null,
    severity: null,
    source: null,
    sku: null,
    url: null,
    fileName: null,
    fileMimeType: null,
  } satisfies Record<(typeof operationsIntentEntityKeys)[number], string | number | boolean | null>
}

export function normalizeResolvedIntent(
  input: Omit<
    OperationsResolvedIntent,
    | "area"
    | "entityType"
    | "actionType"
    | "intakeType"
    | "documentType"
    | "extractionStatus"
    | "extractedEntityTypes"
    | "suggestedActions"
    | "resolvedEntity"
    | "resolvedFrom"
  > & {
    area?: string | null
    entityType?: string | null
    actionType?: string | null
    intakeType?: string | null
    documentType?: string | null
    extractionStatus?: string | null
    extractedEntityTypes?: string[]
    suggestedActions?: unknown
    resolvedEntity?: OperationsResolvedIntent["resolvedEntity"] | Record<string, unknown> | null
    resolvedFrom?: string | null
  },
): OperationsResolvedIntent {
  return {
    ...input,
    confidence: Number.isFinite(input.confidence) ? Math.max(0, Math.min(1, input.confidence)) : 0,
    entities: {
      ...createEmptyIntentEntities(),
      ...input.entities,
      documentType:
        input.entities.documentType ??
        input.entities.type ??
        createEmptyIntentEntities().documentType,
      type:
        input.entities.type ??
        input.entities.documentType ??
        createEmptyIntentEntities().type,
    },
    missingFields: Array.from(new Set(input.missingFields.filter(Boolean))),
    unsafeReason: input.unsafeReason ?? null,
    reply: input.reply?.trim() || defaultReplies[input.intent] || defaultReplies.unknown,
    requiresConfirmation: input.requiresConfirmation ?? false,
    area: normalizeOperationalArea(input.area),
    entityType: normalizeOperationalEntityType(input.entityType),
    actionType: normalizeOperationalActionType(input.actionType),
    targetReference: input.targetReference ?? null,
    clarificationQuestion: input.clarificationQuestion ?? null,
    unsupportedReason: input.unsupportedReason ?? null,
    unresolvedReference: input.unresolvedReference ?? null,
    resolvedFrom: input.resolvedFrom ?? null,
    resolvedEntity: normalizeResolvedEntity(input.resolvedEntity),
    intakeType: normalizeIntakeType(input.intakeType),
    documentType: normalizeDocumentType(input.documentType),
    extractedEntityTypes: (input.extractedEntityTypes ?? []).filter((value): value is OperationalEntityType =>
      operationalEntityTypeValues.includes(value as OperationalEntityType),
    ),
    suggestedActions: normalizeSuggestedActions(input.suggestedActions),
    extractionStatus: normalizeExtractionStatus(input.extractionStatus),
    externalSendIntent: input.externalSendIntent ?? false,
    externalSendBlockedReason: input.externalSendBlockedReason ?? null,
    fileName: input.fileName ?? null,
    fileMimeType: input.fileMimeType ?? null,
    readFields: input.readFields ?? [],
  }
}

export function extractUsageFromOpenAiResponse(usage: unknown): OperationsIntentUsage {
  if (!usage || typeof usage !== "object") {
    return {}
  }

  const usageRecord = usage as Record<string, unknown>
  const promptTokens = typeof usageRecord.input_tokens === "number" ? usageRecord.input_tokens : null
  const completionTokens = typeof usageRecord.output_tokens === "number" ? usageRecord.output_tokens : null
  const totalTokens = typeof usageRecord.total_tokens === "number" ? usageRecord.total_tokens : null

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  }
}
