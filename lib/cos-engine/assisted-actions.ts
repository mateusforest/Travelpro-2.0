import type { OperationalActionType } from "@/lib/cos-engine/action-registry"
import type { OperationalEntityType } from "@/lib/cos-engine/entity-fields"
import type { OperationsDocumentType, OperationsIntakeType } from "@/lib/cos-engine/intake-registry"
import { mapExtractedEntitiesFromDocumentType } from "@/lib/cos-engine/extracted-entity-mapper"

export type AssistedActionSuggestion = {
  label: string
  actionType: OperationalActionType | "send"
  entityType: OperationalEntityType | null
  extractedFields: Record<string, string | number | boolean | null | undefined>
  missingFields: string[]
  confidence: number
  requiresConfirmation: true
  status: "executable" | "unsupported_external_action" | "blocked"
}

export type ExternalSendAnalysis = {
  externalSendIntent: boolean
  externalSendBlockedReason: string | null
}

export function analyzeExternalSendIntent(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const wantsExternalSend = /\b(envie|enviar|mande|mandar|compartilhe|compartilhar)\b/.test(normalized)
  const mentionsChannel = /\b(email|e-mail|whatsapp|documento|contrato|relatorio|relatório)\b/.test(normalized)

  if (!wantsExternalSend || !mentionsChannel) {
    return {
      externalSendIntent: false,
      externalSendBlockedReason: null,
    } satisfies ExternalSendAnalysis
  }

  return {
    externalSendIntent: true,
    externalSendBlockedReason: "external_send_requires_confirmation_and_integration",
  } satisfies ExternalSendAnalysis
}

export function buildAssistedActions(input: {
  intakeType: OperationsIntakeType | null
  documentType: OperationsDocumentType | null
  entities: Record<string, string | number | boolean | null | undefined>
  confidence: number
}): AssistedActionSuggestion[] {
  const documentType = input.documentType ?? "unknown_document"
  const extractedEntityTypes = mapExtractedEntitiesFromDocumentType(documentType)

  return extractedEntityTypes
    .map((entityType) => {
      if (entityType === "client") {
        return {
          label: "Cadastrar cliente",
          actionType: "create",
          entityType,
          extractedFields: input.entities,
          missingFields: input.entities.name || input.entities.clientName ? [] : ["name"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: "executable",
        } satisfies AssistedActionSuggestion
      }

      if (entityType === "income") {
        return {
          label: "Registrar ganho",
          actionType: "register",
          entityType,
          extractedFields: input.entities,
          missingFields: input.entities.amount ? [] : ["amount"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: "executable",
        } satisfies AssistedActionSuggestion
      }

      if (entityType === "expense") {
        return {
          label: "Registrar gasto",
          actionType: "register",
          entityType,
          extractedFields: input.entities,
          missingFields: input.entities.amount ? [] : ["amount"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: "executable",
        } satisfies AssistedActionSuggestion
      }

      if (entityType === "contract") {
        return {
          label: "Cadastrar contrato",
          actionType: "generate",
          entityType,
          extractedFields: input.entities,
          missingFields: input.entities.title || input.entities.clientName ? [] : ["title"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: "unsupported_external_action",
        } satisfies AssistedActionSuggestion
      }

      if (entityType === "report") {
        return {
          label: "Criar relatorio",
          actionType: "generate",
          entityType,
          extractedFields: input.entities,
          missingFields: input.entities.title ? [] : ["title"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: "unsupported_external_action",
        } satisfies AssistedActionSuggestion
      }

      if (entityType === "document" || entityType === "file") {
        return {
          label: "Gerar documento",
          actionType: "generate",
          entityType: "document",
          extractedFields: input.entities,
          missingFields: input.entities.title ? [] : ["title"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: entityType === "document" && input.intakeType !== "photo" ? "executable" : "unsupported_external_action",
        } satisfies AssistedActionSuggestion
      }

      if (entityType === "lead") {
        return {
          label: "Cadastrar lead",
          actionType: "create",
          entityType,
          extractedFields: input.entities,
          missingFields: input.entities.name ? [] : ["name"],
          confidence: input.confidence,
          requiresConfirmation: true,
          status: "unsupported_external_action",
        } satisfies AssistedActionSuggestion
      }

      return {
        label: "Abrir chamado",
        actionType: "open",
        entityType: "ticket",
        extractedFields: input.entities,
        missingFields: input.entities.subject || input.entities.description ? [] : ["description"],
        confidence: input.confidence,
        requiresConfirmation: true,
        status: "executable",
      } satisfies AssistedActionSuggestion
    })
    .slice(0, 5)
}

