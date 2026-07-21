import {
  DollarSign,
  FolderOpen,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { ChatMessage } from "@/components/app/area-chat"
import { travelProAreasByKey } from "@/lib/travelpro-areas"

export type AreaConfig = {
  label: string
  icon: LucideIcon
  color: string
  bg: string
  subsections: string[]
  quickActions: string[]
  messages: ChatMessage[]
  engineArea?: string
  engineSubArea?: string
  subtitle?: string
  emptyLabel?: string
  historyInputs?: Array<{
    area: string
    subArea?: string
  }>
}

export type SessionPageConfig = {
  title: string
  subtitle: string
  emptyLabel: string
  ctaLabel: string
  ctaHref: string
  icon: LucideIcon
  color: string
  bg: string
}

export const slug = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export const areaConfigs: Record<string, AreaConfig> = {
  clientes: {
    label: travelProAreasByKey.clientes.label,
    icon: travelProAreasByKey.clientes.icon,
    color: travelProAreasByKey.clientes.color,
    bg: travelProAreasByKey.clientes.bg,
    subsections: [],
    quickActions: ["Quero cadastrar um cliente", "Buscar cliente pelo nome", "Mostrar clientes com pendencias"],
    messages: [],
    engineArea: "cadastros",
    engineSubArea: "clientes",
    subtitle: "Conversa contextual de clientes da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre clientes.",
    historyInputs: [{ area: "cadastros", subArea: "clientes" }, { area: "cadastros" }],
  },
  viagens: {
    label: travelProAreasByKey.viagens.label,
    icon: travelProAreasByKey.viagens.icon,
    color: travelProAreasByKey.viagens.color,
    bg: travelProAreasByKey.viagens.bg,
    subsections: [],
    quickActions: ["Quero criar uma viagem", "Buscar viagem por cliente", "Mostrar viagens com pendencias"],
    messages: [],
    engineArea: "operacoes",
    engineSubArea: "projetos",
    subtitle: "Conversa contextual de viagens da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre viagens.",
    historyInputs: [{ area: "operacoes", subArea: "projetos" }, { area: "operacoes" }],
  },
  cotacoes: {
    label: travelProAreasByKey.cotacoes.label,
    icon: travelProAreasByKey.cotacoes.icon,
    color: travelProAreasByKey.cotacoes.color,
    bg: travelProAreasByKey.cotacoes.bg,
    subsections: [],
    quickActions: ["Quero montar uma cotacao", "Buscar cotacao por cliente", "Mostrar cotacoes em aberto"],
    messages: [],
    engineArea: "vendas",
    engineSubArea: "propostas",
    subtitle: "Conversa contextual de cotacoes da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre cotacoes.",
    historyInputs: [{ area: "vendas", subArea: "propostas" }, { area: "vendas", subArea: "negociacoes" }, { area: "vendas" }],
  },
  contratos: {
    label: travelProAreasByKey.contratos.label,
    icon: travelProAreasByKey.contratos.icon,
    color: travelProAreasByKey.contratos.color,
    bg: travelProAreasByKey.contratos.bg,
    subsections: [],
    quickActions: ["Quero criar um contrato", "Buscar contrato por cliente", "Mostrar contratos pendentes"],
    messages: [],
    engineArea: "documentos",
    engineSubArea: "contratos",
    subtitle: "Conversa contextual de contratos da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre contratos.",
    historyInputs: [{ area: "documentos", subArea: "contratos" }],
  },
  arquivos: {
    label: travelProAreasByKey.arquivos.label,
    icon: travelProAreasByKey.arquivos.icon,
    color: travelProAreasByKey.arquivos.color,
    bg: travelProAreasByKey.arquivos.bg,
    subsections: [],
    quickActions: ["Quero criar um arquivo", "Buscar arquivo por nome", "Mostrar arquivos recentes"],
    messages: [],
    engineArea: "documentos",
    engineSubArea: "arquivos",
    subtitle: "Conversa contextual de arquivos da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre arquivos.",
    historyInputs: [{ area: "documentos", subArea: "arquivos" }, { area: "documentos" }],
  },
  reservas: {
    label: travelProAreasByKey.reservas.label,
    icon: travelProAreasByKey.reservas.icon,
    color: travelProAreasByKey.reservas.color,
    bg: travelProAreasByKey.reservas.bg,
    subsections: [],
    quickActions: ["Quero registrar uma reserva", "Buscar reserva por cliente", "Mostrar reservas pendentes"],
    messages: [],
    engineArea: "operacoes",
    engineSubArea: "ordens",
    subtitle: "Conversa contextual de reservas da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre reservas.",
    historyInputs: [{ area: "operacoes", subArea: "ordens" }, { area: "operacoes" }],
  },
  financeiro: {
    label: travelProAreasByKey.financeiro.label,
    icon: DollarSign,
    color: travelProAreasByKey.financeiro.color,
    bg: travelProAreasByKey.financeiro.bg,
    subsections: [],
    quickActions: ["Quero registrar um recebimento", "Quero registrar um pagamento", "Mostrar resumo financeiro"],
    messages: [],
    engineArea: "financeiro",
    subtitle: "Conversa contextual do financeiro da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre financeiro.",
    historyInputs: [{ area: "financeiro" }, { area: "financeiro", subArea: "ganhos" }, { area: "financeiro", subArea: "gastos" }],
  },
  documentos: {
    label: travelProAreasByKey.documentos.label,
    icon: FolderOpen,
    color: travelProAreasByKey.documentos.color,
    bg: travelProAreasByKey.documentos.bg,
    subsections: [],
    quickActions: ["Quero criar um documento", "Buscar documento por nome", "Mostrar documentos recentes"],
    messages: [],
    engineArea: "documentos",
    engineSubArea: "arquivos",
    subtitle: "Conversa contextual de documentos da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre documentos.",
    historyInputs: [{ area: "documentos", subArea: "arquivos" }, { area: "documentos" }],
  },
  fornecedores: {
    label: travelProAreasByKey.fornecedores.label,
    icon: travelProAreasByKey.fornecedores.icon,
    color: travelProAreasByKey.fornecedores.color,
    bg: travelProAreasByKey.fornecedores.bg,
    subsections: [],
    quickActions: ["Quero adicionar um fornecedor", "Buscar fornecedor por nome", "Mostrar fornecedores ativos"],
    messages: [],
    engineArea: "equipe",
    engineSubArea: "parceiros",
    subtitle: "Conversa contextual de fornecedores da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre fornecedores.",
    historyInputs: [{ area: "equipe", subArea: "parceiros" }, { area: "equipe" }],
  },
  agenda: {
    label: travelProAreasByKey.agenda.label,
    icon: travelProAreasByKey.agenda.icon,
    color: travelProAreasByKey.agenda.color,
    bg: travelProAreasByKey.agenda.bg,
    subsections: [],
    quickActions: ["Quero agendar um compromisso", "Buscar compromisso por data", "Mostrar proximo compromisso"],
    messages: [],
    engineArea: "reunioes",
    subtitle: "Conversa contextual da agenda da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre agenda.",
    historyInputs: [{ area: "reunioes" }],
  },
  relatorios: {
    label: travelProAreasByKey.relatorios.label,
    icon: travelProAreasByKey.relatorios.icon,
    color: travelProAreasByKey.relatorios.color,
    bg: travelProAreasByKey.relatorios.bg,
    subsections: [],
    quickActions: ["Quero gerar um relatorio", "Buscar relatorio por periodo", "Mostrar relatorios recentes"],
    messages: [],
    engineArea: "documentos",
    engineSubArea: "relatorios",
    subtitle: "Conversa contextual de relatorios da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre relatorios.",
    historyInputs: [{ area: "documentos", subArea: "relatorios" }, { area: "documentos" }],
  },
  recibos: {
    label: travelProAreasByKey.recibos.label,
    icon: travelProAreasByKey.recibos.icon,
    color: travelProAreasByKey.recibos.color,
    bg: travelProAreasByKey.recibos.bg,
    subsections: [],
    quickActions: ["Quero criar um recibo", "Buscar recibo por nome", "Mostrar recibos recentes"],
    messages: [],
    engineArea: "documentos",
    engineSubArea: "recibos",
    subtitle: "Conversa contextual de recibos da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre recibos.",
    historyInputs: [{ area: "documentos", subArea: "recibos" }, { area: "documentos" }],
  },
  "notas-fiscais": {
    label: travelProAreasByKey["notas-fiscais"].label,
    icon: travelProAreasByKey["notas-fiscais"].icon,
    color: travelProAreasByKey["notas-fiscais"].color,
    bg: travelProAreasByKey["notas-fiscais"].bg,
    subsections: [],
    quickActions: ["Quero criar uma nota fiscal", "Buscar nota fiscal por nome", "Mostrar notas fiscais recentes"],
    messages: [],
    engineArea: "documentos",
    engineSubArea: "notas-fiscais",
    subtitle: "Conversa contextual de notas fiscais da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre notas fiscais.",
    historyInputs: [{ area: "documentos", subArea: "notas-fiscais" }, { area: "documentos" }],
  },
  integracoes: {
    label: travelProAreasByKey.integracoes.label,
    icon: travelProAreasByKey.integracoes.icon,
    color: travelProAreasByKey.integracoes.color,
    bg: travelProAreasByKey.integracoes.bg,
    subsections: [],
    quickActions: ["Quero revisar integracoes", "Buscar falhas de integracao", "Mostrar conexoes ativas"],
    messages: [],
    engineArea: "sistema",
    subtitle: "Conversa contextual de integracoes da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre integracoes.",
    historyInputs: [{ area: "sistema" }],
  },
  "studio-ia": {
    label: travelProAreasByKey["studio-ia"].label,
    icon: travelProAreasByKey["studio-ia"].icon,
    color: travelProAreasByKey["studio-ia"].color,
    bg: travelProAreasByKey["studio-ia"].bg,
    subsections: ["Criativos", "Imagens", "Videos", "Campanhas"],
    quickActions: ["Quero criar um criativo", "Quero organizar imagens da agencia", "Quero planejar uma campanha"],
    messages: [],
    engineArea: "sistema",
    subtitle: "Conversa contextual do Studio IA da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar sobre criativos, imagens, videos ou campanhas.",
    historyInputs: [{ area: "sistema", subArea: "studio-ia" }],
  },
  configuracoes: {
    label: travelProAreasByKey.configuracoes.label,
    icon: Settings,
    color: travelProAreasByKey.configuracoes.color,
    bg: travelProAreasByKey.configuracoes.bg,
    subsections: [],
    quickActions: ["Quero revisar configuracoes", "Buscar preferencia da agencia", "Mostrar ajustes recentes"],
    messages: [],
    engineArea: "sistema",
    subtitle: "Conversa contextual de configuracoes da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre configuracoes.",
    historyInputs: [{ area: "sistema" }],
  },
  roteiros: {
    label: travelProAreasByKey.roteiros.label,
    icon: travelProAreasByKey.roteiros.icon,
    color: travelProAreasByKey.roteiros.color,
    bg: travelProAreasByKey.roteiros.bg,
    subsections: [],
    quickActions: ["Quero montar um roteiro", "Buscar roteiro por destino", "Mostrar roteiros em andamento"],
    messages: [],
    engineArea: "vendas",
    subtitle: "Conversa contextual de roteiros da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre roteiros.",
    historyInputs: [{ area: "vendas" }],
  },
  atendimentos: {
    label: travelProAreasByKey.atendimentos.label,
    icon: travelProAreasByKey.atendimentos.icon,
    color: travelProAreasByKey.atendimentos.color,
    bg: travelProAreasByKey.atendimentos.bg,
    subsections: [],
    quickActions: ["Quero abrir um atendimento", "Buscar atendimento por cliente", "Mostrar atendimentos pendentes"],
    messages: [],
    engineArea: "suporte",
    subtitle: "Conversa contextual de atendimentos da sua agencia.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre atendimentos.",
    historyInputs: [{ area: "suporte" }],
  },
  advisor: {
    label: travelProAreasByKey.advisor.label,
    icon: travelProAreasByKey.advisor.icon,
    color: travelProAreasByKey.advisor.color,
    bg: travelProAreasByKey.advisor.bg,
    subsections: [],
    quickActions: ["Quero falar com o Advisor", "Quero revisar prioridades da agencia", "Quero orientacao para o proximo passo"],
    messages: [],
    subtitle: "Conversa contextual do Advisor do seu workspace.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o Advisor.",
    historyInputs: [{ area: "advisor" }],
  },
  agent: {
    label: travelProAreasByKey.agent.label,
    icon: travelProAreasByKey.agent.icon,
    color: travelProAreasByKey.agent.color,
    bg: travelProAreasByKey.agent.bg,
    subsections: [],
    quickActions: ["Quero falar com o Agent", "Quero organizar um atendimento", "Quero acompanhar uma execucao assistida"],
    messages: [],
    subtitle: "Conversa contextual do Agent do seu workspace.",
    emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o Agent.",
    historyInputs: [{ area: "agent" }],
  },
  cadastros: {
    label: travelProAreasByKey.clientes.label,
    icon: travelProAreasByKey.clientes.icon,
    color: travelProAreasByKey.clientes.color,
    bg: travelProAreasByKey.clientes.bg,
    subsections: ["Clientes", "Fornecedores", "Atendimentos"],
    quickActions: ["Quero cadastrar um cliente", "Buscar cliente pelo nome", "Mostrar clientes com pendencias"],
    messages: [],
  },
  operacoes: {
    label: travelProAreasByKey.viagens.label,
    icon: travelProAreasByKey.viagens.icon,
    color: travelProAreasByKey.viagens.color,
    bg: travelProAreasByKey.viagens.bg,
    subsections: ["Viagens", "Reservas", "Agenda"],
    quickActions: ["Quero criar uma viagem", "Buscar viagem por cliente", "Mostrar viagens com pendencias"],
    messages: [],
  },
  vendas: {
    label: travelProAreasByKey.cotacoes.label,
    icon: travelProAreasByKey.cotacoes.icon,
    color: travelProAreasByKey.cotacoes.color,
    bg: travelProAreasByKey.cotacoes.bg,
    subsections: ["Cotacoes", "Roteiros", "Atendimentos"],
    quickActions: ["Quero montar uma cotacao", "Buscar cotacao por cliente", "Mostrar cotacoes em aberto"],
    messages: [],
  },
  equipe: {
    label: travelProAreasByKey.fornecedores.label,
    icon: travelProAreasByKey.fornecedores.icon,
    color: travelProAreasByKey.fornecedores.color,
    bg: travelProAreasByKey.fornecedores.bg,
    subsections: ["Parceiros", "Operadoras", "Companhias", "Hoteis"],
    quickActions: ["Quero adicionar um fornecedor", "Buscar fornecedor por nome", "Mostrar fornecedores ativos"],
    messages: [],
  },
  reunioes: {
    label: travelProAreasByKey.agenda.label,
    icon: travelProAreasByKey.agenda.icon,
    color: travelProAreasByKey.agenda.color,
    bg: travelProAreasByKey.agenda.bg,
    subsections: [],
    quickActions: ["Quero agendar um compromisso", "Buscar compromisso por data", "Mostrar proximo compromisso"],
    messages: [],
  },
  sistema: {
    label: travelProAreasByKey.configuracoes.label,
    icon: Settings,
    color: travelProAreasByKey.configuracoes.color,
    bg: travelProAreasByKey.configuracoes.bg,
    subsections: [],
    quickActions: ["Quero revisar configuracoes", "Buscar falhas de integracao", "Mostrar ajustes recentes"],
    messages: [],
  },
  suporte: {
    label: travelProAreasByKey.atendimentos.label,
    icon: LifeBuoy,
    color: travelProAreasByKey.atendimentos.color,
    bg: travelProAreasByKey.atendimentos.bg,
    subsections: [],
    quickActions: ["Quero abrir um atendimento", "Buscar atendimento por cliente", "Mostrar atendimentos pendentes"],
    messages: [],
  },
}

export const appSessionHrefs = Object.fromEntries(
  Object.entries(travelProAreasByKey).map(([key, area]) => [key, area.route.app]),
) as Record<keyof typeof travelProAreasByKey, string>

const conversationRouteMap: Record<string, keyof typeof travelProAreasByKey> = {
  cadastros: "clientes",
  "cadastros/clientes": "clientes",
  operacoes: "viagens",
  "operacoes/projetos": "viagens",
  "operacoes/ordens": "reservas",
  vendas: "roteiros",
  "vendas/propostas": "cotacoes",
  "vendas/negociacoes": "cotacoes",
  financeiro: "financeiro",
  "financeiro/ganhos": "financeiro",
  "financeiro/gastos": "financeiro",
  equipe: "fornecedores",
  "equipe/parceiros": "fornecedores",
  documentos: "documentos",
  "documentos/arquivos": "arquivos",
  "documentos/contratos": "contratos",
  "documentos/relatorios": "relatorios",
  "documentos/recibos": "recibos",
  "documentos/notas-fiscais": "notas-fiscais",
  reunioes: "agenda",
  sistema: "configuracoes",
  "sistema/studio-ia": "studio-ia",
  "sistema/studio-ia-criativos": "studio-ia",
  "sistema/studio-ia-imagens": "studio-ia",
  "sistema/studio-ia-videos": "studio-ia",
  "sistema/studio-ia-campanhas": "studio-ia",
  suporte: "atendimentos",
  "studio-ia": "studio-ia",
  advisor: "advisor",
  agent: "agent",
}

export function resolveAreaConversationInput(area: string) {
  const config = areaConfigs[area]

  return {
    area: config?.engineArea ?? area,
    subArea: config?.engineSubArea,
  }
}

export function resolveAreaHistoryInputs(area: string) {
  const config = areaConfigs[area]

  if (!config) {
    return [{ area }]
  }

  return config.historyInputs ?? [resolveAreaConversationInput(area)]
}

export function resolveConversationSessionKey(conversationArea?: string | null) {
  if (!conversationArea) {
    return null
  }

  return conversationRouteMap[conversationArea.toLowerCase()] ?? null
}

export function resolveConversationSessionHref(conversationArea?: string | null) {
  const sessionKey = resolveConversationSessionKey(conversationArea)

  if (!sessionKey) {
    return null
  }

  return appSessionHrefs[sessionKey]
}

export const sessionPageConfigs: Record<string, SessionPageConfig> = Object.fromEntries(
  Object.values(travelProAreasByKey).map((area) => [
    area.key,
    {
      title: area.label,
      subtitle: area.app.subtitle,
      emptyLabel: area.app.emptyLabel,
      ctaLabel: area.app.ctaLabel,
      ctaHref: area.destination.app,
      icon: area.icon,
      color: area.color,
      bg: area.bg,
    },
  ]),
)

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Fornecedores comerciais", messages: [] },
  operacional: { label: "Fornecedores operacionais", messages: [] },
  financeiro: { label: "Fornecedores financeiros", messages: [] },
  administrativo: { label: "Fornecedores administrativos", messages: [] },
}
