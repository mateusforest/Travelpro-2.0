import type { OperationalEntityType } from "@/lib/cos-engine/entity-fields"
import type { OperationsDocumentType } from "@/lib/cos-engine/intake-registry"

export function mapExtractedEntitiesFromDocumentType(documentType: OperationsDocumentType): OperationalEntityType[] {
  switch (documentType) {
    case "contract":
      return ["contract", "document", "client", "income"]
    case "proposal":
      return ["proposal", "document", "client"]
    case "report":
      return ["report", "document"]
    case "receipt":
      return ["expense", "document"]
    case "invoice":
      return ["income", "document", "client"]
    case "financial_spreadsheet":
      return ["income", "expense", "report"]
    case "client_list":
      return ["client", "lead"]
    case "form":
      return ["form", "document"]
    case "image_with_data":
      return ["file", "document"]
    case "unknown_document":
    default:
      return ["file", "document"]
  }
}

export function mapFieldsToPrimaryEntity(documentType: OperationsDocumentType) {
  switch (documentType) {
    case "contract":
      return "contract"
    case "proposal":
      return "proposal"
    case "report":
      return "report"
    case "receipt":
      return "expense"
    case "invoice":
      return "income"
    case "financial_spreadsheet":
      return "report"
    case "client_list":
      return "client"
    case "form":
      return "form"
    case "image_with_data":
      return "document"
    case "unknown_document":
    default:
      return "document"
  }
}
