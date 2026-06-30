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
  cadastros: {
    label: travelProAreasByKey.clientes.label,
    icon: travelProAreasByKey.clientes.icon,
    color: travelProAreasByKey.clientes.color,
    bg: travelProAreasByKey.clientes.bg,
    subsections: ["Clientes", "Fornecedores", "Atendimentos"],
    quickActions: ["Criar cliente", "Buscar cliente", "Ver clientes no Portal"],
    messages: [],
  },
  operacoes: {
    label: travelProAreasByKey.viagens.label,
    icon: travelProAreasByKey.viagens.icon,
    color: travelProAreasByKey.viagens.color,
    bg: travelProAreasByKey.viagens.bg,
    subsections: ["Viagens", "Reservas", "Agenda"],
    quickActions: ["Criar viagem", "Buscar viagem", "Ver viagens no Portal"],
    messages: [],
  },
  vendas: {
    label: travelProAreasByKey.cotacoes.label,
    icon: travelProAreasByKey.cotacoes.icon,
    color: travelProAreasByKey.cotacoes.color,
    bg: travelProAreasByKey.cotacoes.bg,
    subsections: ["Cotacoes", "Roteiros", "Atendimentos"],
    quickActions: ["Criar cotacao", "Buscar cotacao", "Ver cotacoes no Portal"],
    messages: [],
  },
  financeiro: {
    label: travelProAreasByKey.financeiro.label,
    icon: DollarSign,
    color: travelProAreasByKey.financeiro.color,
    bg: travelProAreasByKey.financeiro.bg,
    subsections: ["Recebimentos", "Pagamentos", "Fluxo de caixa"],
    quickActions: ["Registrar recebimento", "Registrar pagamento", "Ver financeiro no Portal"],
    messages: [],
  },
  equipe: {
    label: travelProAreasByKey.fornecedores.label,
    icon: travelProAreasByKey.fornecedores.icon,
    color: travelProAreasByKey.fornecedores.color,
    bg: travelProAreasByKey.fornecedores.bg,
    subsections: ["Parceiros", "Operadoras", "Companhias", "Hoteis"],
    quickActions: ["Adicionar fornecedor", "Buscar fornecedor", "Ver fornecedores no Portal"],
    messages: [],
  },
  documentos: {
    label: travelProAreasByKey.documentos.label,
    icon: FolderOpen,
    color: travelProAreasByKey.documentos.color,
    bg: travelProAreasByKey.documentos.bg,
    subsections: ["Contratos", "Documentos", "Relatorios"],
    quickActions: ["Criar documento", "Buscar arquivo", "Ver documentos no Portal"],
    messages: [],
  },
  reunioes: {
    label: travelProAreasByKey.agenda.label,
    icon: travelProAreasByKey.agenda.icon,
    color: travelProAreasByKey.agenda.color,
    bg: travelProAreasByKey.agenda.bg,
    subsections: [],
    quickActions: ["Criar atendimento", "Buscar agenda", "Ver agenda no Portal"],
    messages: [],
  },
  sistema: {
    label: travelProAreasByKey.configuracoes.label,
    icon: Settings,
    color: travelProAreasByKey.configuracoes.color,
    bg: travelProAreasByKey.configuracoes.bg,
    subsections: [],
    quickActions: ["Ver configuracoes", "Abrir integracoes", "Acessar Portal"],
    messages: [],
  },
  suporte: {
    label: travelProAreasByKey.atendimentos.label,
    icon: LifeBuoy,
    color: travelProAreasByKey.atendimentos.color,
    bg: travelProAreasByKey.atendimentos.bg,
    subsections: [],
    quickActions: ["Iniciar atendimento"],
    messages: [],
  },
}

export const appSessionHrefs = Object.fromEntries(
  Object.entries(travelProAreasByKey).map(([key, area]) => [key, area.route.app]),
) as Record<keyof typeof travelProAreasByKey, string>

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
