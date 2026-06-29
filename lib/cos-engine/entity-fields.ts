export const operationalEntityFields = {
  client: ["name", "email", "phone", "company", "notes"],
  lead: ["name", "email", "phone", "source", "status", "notes"],
  product: ["name", "price", "description", "category", "sku", "notes"],
  service: ["name", "price", "description", "category", "notes"],
  project: ["title", "description", "status", "priority", "due_date", "responsible", "notes"],
  order: ["title", "description", "status", "priority", "responsible", "notes"],
  process: ["title", "description", "status", "stage", "responsible", "notes"],
  proposal: ["title", "client", "value", "status", "due_date", "notes"],
  negotiation: ["title", "client", "value", "stage", "status", "notes"],
  task: ["title", "description", "status", "priority", "due_date", "responsible", "notes"],
  income: ["amount", "description", "category", "date", "notes"],
  expense: ["amount", "description", "category", "date", "notes"],
  cash_flow: ["amount", "description", "category", "date", "notes"],
  member: ["name", "email", "role", "department", "phone", "notes"],
  document: ["title", "type", "content", "client", "status", "notes"],
  contract: ["title", "client", "value", "status", "content", "notes"],
  file: ["title", "type", "url", "notes"],
  form: ["title", "description", "status", "notes"],
  report: ["title", "period", "content", "notes"],
  meeting: ["title", "description", "date", "participants", "notes", "summary"],
  ticket: ["title", "description", "category", "priority", "status", "notes"],
  system_log: ["log_type", "title", "description", "severity", "status"],
  integration: ["title", "description", "status", "notes"],
  marketing_action: ["title", "description", "status", "category", "notes"],
} as const

export type OperationalEntityType = keyof typeof operationalEntityFields
export type OperationalFieldKey = (typeof operationalEntityFields)[OperationalEntityType][number]
export const operationalEntityTypeValues = Object.keys(operationalEntityFields) as OperationalEntityType[]
