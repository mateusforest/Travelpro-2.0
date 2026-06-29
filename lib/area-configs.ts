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
    label: "Clientes",
    icon: Users,
    color: "#ec4899",
    bg: "#fce7f3",
    subsections: ["Clientes", "Fornecedores", "Atendimentos"],
    quickActions: ["Criar cliente", "Buscar cliente", "Ver clientes no Portal"],
    messages: [],
  },
  operacoes: {
    label: "Viagens",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
    subsections: ["Viagens", "Reservas", "Agenda"],
    quickActions: ["Criar viagem", "Buscar viagem", "Ver viagens no Portal"],
    messages: [],
  },
  vendas: {
    label: "Cotações",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
    subsections: ["Cotações", "Roteiros", "Atendimentos"],
    quickActions: ["Criar cotação", "Buscar cotação", "Ver cotações no Portal"],
    messages: [],
  },
  financeiro: {
    label: "Financeiro",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
    subsections: ["Recebimentos", "Pagamentos", "Fluxo de caixa"],
    quickActions: ["Registrar recebimento", "Registrar pagamento", "Ver financeiro no Portal"],
    messages: [],
  },
  equipe: {
    label: "Fornecedores",
    icon: UsersRound,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    subsections: ["Parceiros", "Operadoras", "Companhias", "Hotéis"],
    quickActions: ["Adicionar fornecedor", "Buscar fornecedor", "Ver fornecedores no Portal"],
    messages: [],
  },
  documentos: {
    label: "Documentos",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
    subsections: ["Contratos", "Documentos", "Relatórios"],
    quickActions: ["Criar documento", "Buscar arquivo", "Ver documentos no Portal"],
    messages: [],
  },
  reunioes: {
    label: "Agenda",
    icon: Video,
    color: "#ef4444",
    bg: "#fee2e2",
    subsections: [],
    quickActions: ["Criar atendimento", "Buscar agenda", "Ver agenda no Portal"],
    messages: [],
  },
  sistema: {
    label: "Configurações",
    icon: Settings,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Ver configurações", "Abrir integrações", "Acessar Portal"],
    messages: [],
  },
  suporte: {
    label: "Atendimentos",
    icon: LifeBuoy,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Iniciar atendimento"],
    messages: [],
  },
}

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Fornecedores comerciais", messages: [] },
  operacional: { label: "Fornecedores operacionais", messages: [] },
  financeiro: { label: "Fornecedores financeiros", messages: [] },
  administrativo: { label: "Fornecedores administrativos", messages: [] },
}
