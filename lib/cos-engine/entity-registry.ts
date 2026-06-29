import type { OperationalActionType } from "@/lib/cos-engine/action-registry"
import { operationalEntityAliases } from "@/lib/cos-engine/entity-aliases"
import { operationalEntityFields, type OperationalEntityType } from "@/lib/cos-engine/entity-fields"

export type OperationalArea =
  | "cadastros"
  | "operacoes"
  | "vendas"
  | "financeiro"
  | "equipe"
  | "documentos"
  | "reunioes"
  | "suporte"
  | "sistema"

export const operationalAreaValues: OperationalArea[] = [
  "cadastros",
  "operacoes",
  "vendas",
  "financeiro",
  "equipe",
  "documentos",
  "reunioes",
  "suporte",
  "sistema",
]

export type OperationalEntityConfig = {
  label: string
  area: OperationalArea
  aliases: readonly string[]
  fields: readonly string[]
  supportedActionKinds: readonly OperationalActionType[]
  executableActionKinds: readonly OperationalActionType[]
}

export const operationalEntityRegistry: Record<OperationalEntityType, OperationalEntityConfig> = {
  client: {
    label: "cliente",
    area: "cadastros",
    aliases: operationalEntityAliases.client,
    fields: operationalEntityFields.client,
    supportedActionKinds: ["create", "update", "read", "list", "search", "count"],
    executableActionKinds: ["create", "update", "count"],
  },
  lead: {
    label: "lead",
    area: "cadastros",
    aliases: operationalEntityAliases.lead,
    fields: operationalEntityFields.lead,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  product: {
    label: "produto",
    area: "cadastros",
    aliases: operationalEntityAliases.product,
    fields: operationalEntityFields.product,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  service: {
    label: "servico",
    area: "cadastros",
    aliases: operationalEntityAliases.service,
    fields: operationalEntityFields.service,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  project: {
    label: "projeto",
    area: "operacoes",
    aliases: operationalEntityAliases.project,
    fields: operationalEntityFields.project,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: ["create"],
  },
  order: {
    label: "ordem",
    area: "operacoes",
    aliases: operationalEntityAliases.order,
    fields: operationalEntityFields.order,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  process: {
    label: "processo",
    area: "operacoes",
    aliases: operationalEntityAliases.process,
    fields: operationalEntityFields.process,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  proposal: {
    label: "proposta",
    area: "vendas",
    aliases: operationalEntityAliases.proposal,
    fields: operationalEntityFields.proposal,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  negotiation: {
    label: "negociacao",
    area: "vendas",
    aliases: operationalEntityAliases.negotiation,
    fields: operationalEntityFields.negotiation,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  task: {
    label: "tarefa",
    area: "operacoes",
    aliases: operationalEntityAliases.task,
    fields: operationalEntityFields.task,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  income: {
    label: "ganho",
    area: "financeiro",
    aliases: operationalEntityAliases.income,
    fields: operationalEntityFields.income,
    supportedActionKinds: ["create", "read", "list", "summarize"],
    executableActionKinds: ["create"],
  },
  expense: {
    label: "gasto",
    area: "financeiro",
    aliases: operationalEntityAliases.expense,
    fields: operationalEntityFields.expense,
    supportedActionKinds: ["create", "update", "read", "list", "summarize"],
    executableActionKinds: ["create"],
  },
  cash_flow: {
    label: "fluxo de caixa",
    area: "financeiro",
    aliases: operationalEntityAliases.cash_flow,
    fields: operationalEntityFields.cash_flow,
    supportedActionKinds: ["read", "summarize"],
    executableActionKinds: ["summarize"],
  },
  member: {
    label: "membro",
    area: "equipe",
    aliases: operationalEntityAliases.member,
    fields: operationalEntityFields.member,
    supportedActionKinds: ["create", "update", "read", "list", "search"],
    executableActionKinds: [],
  },
  document: {
    label: "documento",
    area: "documentos",
    aliases: operationalEntityAliases.document,
    fields: operationalEntityFields.document,
    supportedActionKinds: ["create", "update", "read", "list", "search", "generate"],
    executableActionKinds: ["create", "generate"],
  },
  contract: {
    label: "contrato",
    area: "documentos",
    aliases: operationalEntityAliases.contract,
    fields: operationalEntityFields.contract,
    supportedActionKinds: ["create", "update", "read", "list", "generate"],
    executableActionKinds: [],
  },
  file: {
    label: "arquivo",
    area: "documentos",
    aliases: operationalEntityAliases.file,
    fields: operationalEntityFields.file,
    supportedActionKinds: ["create", "update", "read", "list"],
    executableActionKinds: [],
  },
  form: {
    label: "formulario",
    area: "documentos",
    aliases: operationalEntityAliases.form,
    fields: operationalEntityFields.form,
    supportedActionKinds: ["create", "update", "read", "list", "generate"],
    executableActionKinds: [],
  },
  report: {
    label: "relatorio",
    area: "documentos",
    aliases: operationalEntityAliases.report,
    fields: operationalEntityFields.report,
    supportedActionKinds: ["create", "read", "list", "generate"],
    executableActionKinds: [],
  },
  meeting: {
    label: "reuniao",
    area: "reunioes",
    aliases: operationalEntityAliases.meeting,
    fields: operationalEntityFields.meeting,
    supportedActionKinds: ["create", "update", "read", "list"],
    executableActionKinds: ["create"],
  },
  ticket: {
    label: "chamado",
    area: "suporte",
    aliases: operationalEntityAliases.ticket,
    fields: operationalEntityFields.ticket,
    supportedActionKinds: ["create", "update", "read", "list", "search", "open"],
    executableActionKinds: ["create"],
  },
  system_log: {
    label: "log",
    area: "sistema",
    aliases: operationalEntityAliases.system_log,
    fields: operationalEntityFields.system_log,
    supportedActionKinds: ["read", "list", "search"],
    executableActionKinds: [],
  },
  integration: {
    label: "integracao",
    area: "sistema",
    aliases: operationalEntityAliases.integration,
    fields: operationalEntityFields.integration,
    supportedActionKinds: ["read", "list", "search", "open"],
    executableActionKinds: [],
  },
  marketing_action: {
    label: "acao de marketing",
    area: "vendas",
    aliases: operationalEntityAliases.marketing_action,
    fields: operationalEntityFields.marketing_action,
    supportedActionKinds: ["create", "update", "read", "list"],
    executableActionKinds: [],
  },
}
