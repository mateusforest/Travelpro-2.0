import { buildAssistedActions, analyzeExternalSendIntent } from "@/lib/cos-engine/assisted-actions"
import { extractionSchemaByDocumentType, type ExtractedPreview } from "@/lib/cos-engine/extraction-schema"
import { inferDocumentTypeFromText, inferIntakeTypeFromMessage, type OperationsDocumentType, type OperationsIntakeType } from "@/lib/cos-engine/intake-registry"
import { mapExtractedEntitiesFromDocumentType } from "@/lib/cos-engine/extracted-entity-mapper"

export function classifyFileIntake(input: {
  message: string
  fileName?: string | null
  fileMimeType?: string | null
  entities?: Record<string, string | number | boolean | null | undefined>
  confidence?: number
}): {
  intakeType: OperationsIntakeType
  documentType: OperationsDocumentType
  extractedEntityTypes: import("@/lib/cos-engine/entity-fields").OperationalEntityType[]
  extractionStatus: "awaiting_file" | "classified_only" | "preview_ready" | "needs_review"
  preview: ExtractedPreview
  suggestedActions: import("@/lib/cos-engine/assisted-actions").AssistedActionSuggestion[]
  requiresConfirmation: boolean
  externalSendIntent: boolean
  externalSendBlockedReason: string | null
  extractionFields: typeof extractionSchemaByDocumentType[OperationsDocumentType]
} {
  const intakeType = inferIntakeTypeFromMessage(input.message, input.fileMimeType)
  const documentType = inferDocumentTypeFromText([input.message, input.fileName || "", input.fileMimeType || ""].join(" "))
  const extractedEntityTypes = mapExtractedEntitiesFromDocumentType(documentType)
  const confidence = input.confidence ?? (intakeType === "unknown" ? 0.45 : 0.78)
  const hasAttachedFile = Boolean((input.fileName || "").trim() || (input.fileMimeType || "").trim())
  const extractionStatus =
    intakeType === "unknown"
      ? "awaiting_file"
      : !hasAttachedFile && (intakeType === "photo" || intakeType === "document" || intakeType === "spreadsheet" || intakeType === "file")
        ? "awaiting_file"
        : intakeType === "photo" || intakeType === "document" || intakeType === "spreadsheet" || intakeType === "file"
          ? "classified_only"
        : "needs_review"

  const preview: ExtractedPreview = {
    documentType,
    extractedEntityTypes,
    fields: {
      ...(input.entities ?? {}),
      fileName: input.fileName ?? null,
      fileMimeType: input.fileMimeType ?? null,
      source: intakeType === "photo" ? "image" : intakeType,
    },
    confidence,
    extractionStatus,
  }

  const suggestedActions = buildAssistedActions({
    intakeType,
    documentType,
    entities: preview.fields,
    confidence,
  })
  const externalSend = analyzeExternalSendIntent(input.message)

  return {
    intakeType,
    documentType,
    extractedEntityTypes,
    extractionStatus,
    preview,
    suggestedActions,
    requiresConfirmation: suggestedActions.length > 0 || externalSend.externalSendIntent,
    externalSendIntent: externalSend.externalSendIntent,
    externalSendBlockedReason: externalSend.externalSendBlockedReason,
    extractionFields: extractionSchemaByDocumentType[documentType],
  }
}

export function buildIntakePromptSummary(input: {
  intakeType: OperationsIntakeType | null
  documentType: OperationsDocumentType | null
}) {
  return {
    intakeType: input.intakeType,
    documentType: input.documentType,
    extractionFields: input.documentType ? extractionSchemaByDocumentType[input.documentType] : [],
    extractedEntityTypes: input.documentType ? mapExtractedEntitiesFromDocumentType(input.documentType) : [],
  }
}
