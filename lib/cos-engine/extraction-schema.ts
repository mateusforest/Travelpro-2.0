import type { OperationalEntityType } from "@/lib/cos-engine/entity-fields"
import type { OperationsDocumentType } from "@/lib/cos-engine/intake-registry"

export type ExtractionFieldDefinition = {
  key: string
  label: string
  required?: boolean
}

export type ExtractedPreview = {
  documentType: OperationsDocumentType
  extractedEntityTypes: OperationalEntityType[]
  fields: Record<string, string | number | boolean | null | undefined>
  confidence: number
  extractionStatus: "awaiting_file" | "classified_only" | "preview_ready" | "needs_review"
}

export const extractionSchemaByDocumentType: Record<OperationsDocumentType, ExtractionFieldDefinition[]> = {
  contract: [
    { key: "clientName", label: "Cliente / locatario" },
    { key: "landlordName", label: "Locador" },
    { key: "documentNumber", label: "CPF/CNPJ" },
    { key: "address", label: "Endereco" },
    { key: "city", label: "Cidade" },
    { key: "state", label: "Estado" },
    { key: "responsible", label: "Responsavel" },
    { key: "guarantor", label: "Fiador" },
    { key: "amount", label: "Valor mensal" },
    { key: "depositAmount", label: "Caucao" },
    { key: "dueDate", label: "Vencimento" },
    { key: "startDate", label: "Data de inicio" },
    { key: "endDate", label: "Data de fim" },
    { key: "term", label: "Prazo" },
    { key: "fineAmount", label: "Multa" },
    { key: "adjustmentIndex", label: "Indice de reajuste" },
    { key: "forum", label: "Foro" },
    { key: "items", label: "Equipamentos / produtos / servicos" },
  ],
  proposal: [
    { key: "clientName", label: "Cliente" },
    { key: "title", label: "Titulo" },
    { key: "value", label: "Valor" },
    { key: "dueDate", label: "Validade" },
  ],
  report: [
    { key: "title", label: "Titulo" },
    { key: "period", label: "Periodo" },
    { key: "summary", label: "Resumo" },
  ],
  receipt: [
    { key: "amount", label: "Valor" },
    { key: "date", label: "Data" },
    { key: "description", label: "Descricao" },
  ],
  invoice: [
    { key: "invoiceNumber", label: "Numero da nota" },
    { key: "amount", label: "Valor" },
    { key: "date", label: "Data" },
    { key: "issuer", label: "Emitente" },
  ],
  financial_spreadsheet: [
    { key: "period", label: "Periodo" },
    { key: "amount", label: "Valor" },
    { key: "category", label: "Categoria" },
  ],
  client_list: [
    { key: "name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
  ],
  form: [
    { key: "title", label: "Titulo" },
    { key: "description", label: "Descricao" },
  ],
  image_with_data: [
    { key: "description", label: "Descricao visual" },
    { key: "possibleEntity", label: "Possivel entidade" },
  ],
  unknown_document: [
    { key: "title", label: "Titulo" },
    { key: "description", label: "Descricao" },
  ],
}
