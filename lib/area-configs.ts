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
  FileText,
  Calendar,
  BarChart3,
  Link2,
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

export const appSessionHrefs = {
  clientes: "/app/conversas/clientes",
  viagens: "/app/conversas/viagens",
  cotacoes: "/app/conversas/cotacoes",
  contratos: "/app/conversas/contratos",
  reservas: "/app/conversas/reservas",
  financeiro: "/app/conversas/financeiro",
  documentos: "/app/conversas/documentos",
  fornecedores: "/app/conversas/fornecedores",
  agenda: "/app/conversas/agenda",
  relatorios: "/app/conversas/relatorios",
  integracoes: "/app/conversas/integracoes",
  configuracoes: "/app/conversas/configuracoes",
  roteiros: "/app/conversas/roteiros",
  atendimentos: "/app/conversas/atendimentos",
} as const

export const sessionPageConfigs: Record<string, SessionPageConfig> = {
  clientes: {
    title: "Clientes",
    subtitle: "Gerencie sua base de clientes em um lugar so.",
    emptyLabel: "Nenhum cliente disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo cliente",
    ctaHref: "/app/novo/cliente",
    icon: Users,
    color: "#ec4899",
    bg: "#fce7f3",
  },
  viagens: {
    title: "Viagens",
    subtitle: "Acompanhe viagens, etapas e responsaveis da operacao.",
    emptyLabel: "Nenhuma viagem disponivel nesta sessao por enquanto.",
    ctaLabel: "Nova viagem",
    ctaHref: "/app/novo/viagem",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
  },
  cotacoes: {
    title: "Cotacoes",
    subtitle: "Centralize propostas e oportunidades comerciais.",
    emptyLabel: "Nenhuma cotacao disponivel nesta sessao por enquanto.",
    ctaLabel: "Nova cotacao",
    ctaHref: "/app/novo/cotacao",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
  },
  contratos: {
    title: "Contratos",
    subtitle: "Organize contratos e acompanhamentos da agencia.",
    emptyLabel: "Nenhum contrato disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo contrato",
    ctaHref: "/app/novo/contrato",
    icon: FileText,
    color: "#ef4444",
    bg: "#fee2e2",
  },
  reservas: {
    title: "Reservas",
    subtitle: "Consolide reservas e confirmacoes da operacao.",
    emptyLabel: "Nenhuma reserva disponivel nesta sessao por enquanto.",
    ctaLabel: "Nova reserva",
    ctaHref: "/app/novo/reserva",
    icon: Calendar,
    color: "#0ea5e9",
    bg: "#e0f2fe",
  },
  financeiro: {
    title: "Financeiro",
    subtitle: "Veja os lancamentos e o saldo da operacao.",
    emptyLabel: "Nenhum lancamento disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo lancamento",
    ctaHref: "/app/novo/financeiro",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
  },
  documentos: {
    title: "Documentos",
    subtitle: "Mantenha os documentos importantes da agencia organizados.",
    emptyLabel: "Nenhum documento disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo documento",
    ctaHref: "/app/novo/documento",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
  },
  fornecedores: {
    title: "Fornecedores",
    subtitle: "Acompanhe parceiros, operadoras e contatos chave.",
    emptyLabel: "Nenhum fornecedor disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo fornecedor",
    ctaHref: "/app/novo/fornecedor",
    icon: UsersRound,
    color: "#0ea5e9",
    bg: "#e0f2fe",
  },
  agenda: {
    title: "Agenda",
    subtitle: "Visualize compromissos e proximos atendimentos.",
    emptyLabel: "Nenhum compromisso disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo compromisso",
    ctaHref: "/app/novo/agenda",
    icon: Video,
    color: "#ef4444",
    bg: "#fee2e2",
  },
  relatorios: {
    title: "Relatorios",
    subtitle: "Consulte indicadores e visoes consolidadas da operacao.",
    emptyLabel: "Nenhum relatorio disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo relatorio",
    ctaHref: "/app/novo/relatorio",
    icon: BarChart3,
    color: "#f97316",
    bg: "#ffedd5",
  },
  integracoes: {
    title: "Integracoes",
    subtitle: "Conecte sistemas e acompanhe configuracoes externas.",
    emptyLabel: "Nenhuma integracao disponivel nesta sessao por enquanto.",
    ctaLabel: "Nova integracao",
    ctaHref: "/app/novo/integracao",
    icon: Link2,
    color: "#6b7280",
    bg: "#f3f4f6",
  },
  configuracoes: {
    title: "Configuracoes",
    subtitle: "Ajuste preferencias e parametros da sua agencia.",
    emptyLabel: "Nenhuma configuracao disponivel nesta sessao por enquanto.",
    ctaLabel: "Abrir configuracoes",
    ctaHref: "/app/voce",
    icon: Settings,
    color: "#6b7280",
    bg: "#f3f4f6",
  },
  roteiros: {
    title: "Roteiros",
    subtitle: "Monte roteiros e sugestoes para as viagens.",
    emptyLabel: "Nenhum roteiro disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo roteiro",
    ctaHref: "/app/novo/roteiro",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
  },
  atendimentos: {
    title: "Atendimentos",
    subtitle: "Registre interacoes e acompanhe o historico do cliente.",
    emptyLabel: "Nenhum atendimento disponivel nesta sessao por enquanto.",
    ctaLabel: "Novo atendimento",
    ctaHref: "/app/novo/atendimento",
    icon: LifeBuoy,
    color: "#6b7280",
    bg: "#f3f4f6",
  },
}

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Fornecedores comerciais", messages: [] },
  operacional: { label: "Fornecedores operacionais", messages: [] },
  financeiro: { label: "Fornecedores financeiros", messages: [] },
  administrativo: { label: "Fornecedores administrativos", messages: [] },
}
