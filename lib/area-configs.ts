import {
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  UsersRound,
  FolderOpen,
  Video,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react"
import type { ChatMessage } from "@/components/app/area-chat"

export type AreaConfig = {
  label: string
  icon: LucideIcon
  color: string
  bg: string
  subsections: string[]
  quickActions: string[]
  messages: ChatMessage[]
}

export const slug = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export const areaConfigs: Record<string, AreaConfig> = {
  cadastros: {
    label: "Cadastros",
    icon: Users,
    color: "#ec4899",
    bg: "#fce7f3",
    subsections: ["Clientes", "Leads", "Produtos", "Serviços"],
    quickActions: ["Criar cliente", "Buscar cliente", "Ver clientes no Portal"],
    messages: [],
  },
  operacoes: {
    label: "Operações",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
    subsections: ["Projetos", "Ordens", "Processos"],
    quickActions: ["Criar operação", "Buscar operação", "Ver operações no Portal"],
    messages: [],
  },
  vendas: {
    label: "Vendas",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
    subsections: ["Propostas", "Negociações", "Funil"],
    quickActions: ["Criar proposta", "Buscar negociação", "Ver vendas no Portal"],
    messages: [],
  },
  financeiro: {
    label: "Financeiro",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
    subsections: ["Ganhos", "Gastos", "Fluxo de caixa"],
    quickActions: ["Registrar ganho", "Registrar gasto", "Ver financeiro no Portal"],
    messages: [],
  },
  equipe: {
    label: "Equipe",
    icon: UsersRound,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    subsections: ["Comercial", "Operacional", "Financeiro", "Administrativo"],
    quickActions: ["Adicionar membro", "Falar com a equipe", "Ver equipe no Portal"],
    messages: [],
  },
  documentos: {
    label: "Documentos",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
    subsections: ["Contratos", "Arquivos", "Relatórios"],
    quickActions: ["Criar documento", "Buscar arquivo", "Ver documentos no Portal"],
    messages: [],
  },
  reunioes: {
    label: "Reuniões",
    icon: Video,
    color: "#ef4444",
    bg: "#fee2e2",
    subsections: [],
    quickActions: ["Criar reunião", "Buscar reunião", "Ver reuniões no Portal"],
    messages: [],
  },
  sistema: {
    label: "Sistema",
    icon: Settings,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Ver logs", "Abrir integrações", "Acessar Portal"],
    messages: [],
  },
  suporte: {
    label: "Suporte",
    icon: LifeBuoy,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Iniciar suporte"],
    messages: [],
  },
}

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Equipe Comercial", messages: [] },
  operacional: { label: "Equipe Operacional", messages: [] },
  financeiro: { label: "Equipe Financeira", messages: [] },
  administrativo: { label: "Equipe Administrativa", messages: [] },
}
