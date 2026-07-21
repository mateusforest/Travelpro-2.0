import {
  BarChart3,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  FolderOpen,
  Headphones,
  LifeBuoy,
  Link2,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound,
  Video,
  type LucideIcon,
} from "lucide-react"

export type TravelProAreaKey =
  | "clientes"
  | "viagens"
  | "cotacoes"
  | "contratos"
  | "arquivos"
  | "reservas"
  | "financeiro"
  | "documentos"
  | "fornecedores"
  | "agenda"
  | "relatorios"
  | "recibos"
  | "notas-fiscais"
  | "integracoes"
  | "configuracoes"
  | "studio-ia"
  | "roteiros"
  | "atendimentos"
  | "advisor"
  | "agent"

export type TravelProAreaStatus = "active" | "soon"

export type TravelProArea = {
  key: TravelProAreaKey
  label: string
  icon: LucideIcon
  color: string
  bg: string
  status: TravelProAreaStatus
  premiumExpansion?: boolean
  route: {
    app: string
    portal: string
  }
  destination: {
    app: string
    portal: string
  }
  app: {
    subtitle: string
    emptyLabel: string
    ctaLabel: string
  }
  portal: {
    description: string
    emptyLabel: string
    ctaLabel: string
    ctaDisabled?: boolean
    favorite?: boolean
    aliases?: string[]
    manager?: "clients" | "financial" | "documents" | "trips" | "quotes" | "bookings" | "contracts" | "suppliers"
    documentFilterType?: string
  }
}

export const travelProAreas: TravelProArea[] = [
  {
    key: "clientes",
    label: "Clientes",
    icon: Users,
    color: "#ec4899",
    bg: "#fce7f3",
    status: "active",
    route: { app: "/app/conversas/clientes", portal: "/portal/cadastros" },
    destination: { app: "/app/novo/cliente", portal: "/portal/cadastros" },
    app: {
      subtitle: "Gerencie sua base de clientes em um lugar so.",
      emptyLabel: "Nenhum cliente disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo cliente",
    },
    portal: {
      description: "Gerencie clientes, contatos e relacionamentos da agencia.",
      emptyLabel: "Nenhum cliente disponivel ainda.",
      ctaLabel: "Novo cliente",
      favorite: true,
      aliases: ["cadastros"],
      manager: "clients",
    },
  },
  {
    key: "viagens",
    label: "Viagens",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
    status: "soon",
    route: { app: "/app/conversas/viagens", portal: "/portal/viagens" },
    destination: { app: "/app/novo/viagem", portal: "/portal/viagens" },
    app: {
      subtitle: "Acompanhe viagens, etapas e responsaveis da operacao.",
      emptyLabel: "Nenhuma viagem disponivel nesta sessao por enquanto.",
      ctaLabel: "Nova viagem",
    },
    portal: {
      description: "Acompanhe viagens, datas, clientes e etapas da operacao da agencia.",
      emptyLabel: "Nenhuma viagem registrada ainda.",
      ctaLabel: "Nova viagem",
      manager: "trips",
    },
  },
  {
    key: "cotacoes",
    label: "Cotacoes",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
    status: "soon",
    route: { app: "/app/conversas/cotacoes", portal: "/portal/vendas" },
    destination: { app: "/app/novo/cotacao", portal: "/portal/vendas" },
    app: {
      subtitle: "Centralize propostas e oportunidades comerciais.",
      emptyLabel: "Nenhuma cotacao disponivel nesta sessao por enquanto.",
      ctaLabel: "Nova cotacao",
    },
    portal: {
      description: "Acompanhe cotacoes, propostas e oportunidades da agencia.",
      emptyLabel: "Nenhuma cotacao registrada ainda.",
      ctaLabel: "Nova cotacao",
      favorite: true,
      aliases: ["vendas"],
      manager: "quotes",
    },
  },
  {
    key: "contratos",
    label: "Contratos",
    icon: FileText,
    color: "#ef4444",
    bg: "#fee2e2",
    status: "soon",
    route: { app: "/app/conversas/contratos", portal: "/portal/operacoes" },
    destination: { app: "/app/novo/contrato", portal: "/portal/operacoes" },
    app: {
      subtitle: "Organize contratos e acompanhamentos da agencia.",
      emptyLabel: "Nenhum contrato disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo contrato",
    },
    portal: {
      description: "Organize contratos, etapas de assinatura e documentos vinculados.",
      emptyLabel: "Nenhum contrato cadastrado ainda.",
      ctaLabel: "Novo contrato",
      aliases: ["operacoes", "contratos"],
      manager: "contracts",
    },
  },
  {
    key: "reservas",
    label: "Reservas",
    icon: Calendar,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    status: "soon",
    route: { app: "/app/conversas/reservas", portal: "/portal/conversas" },
    destination: { app: "/app/novo/reserva", portal: "/portal/conversas" },
    app: {
      subtitle: "Consolide reservas e confirmacoes da operacao.",
      emptyLabel: "Nenhuma reserva disponivel nesta sessao por enquanto.",
      ctaLabel: "Nova reserva",
    },
    portal: {
      description: "Acompanhe reservas, confirmacoes e proximos passos da operacao.",
      emptyLabel: "Nenhuma reserva registrada ainda.",
      ctaLabel: "Nova reserva",
      aliases: ["conversas"],
      manager: "bookings",
    },
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
    status: "active",
    route: { app: "/app/conversas/financeiro", portal: "/portal/financeiro" },
    destination: { app: "/app/novo/financeiro", portal: "/portal/financeiro" },
    app: {
      subtitle: "Veja os lancamentos e o saldo da operacao.",
      emptyLabel: "Nenhum lancamento disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo lancamento",
    },
    portal: {
      description: "Visualize o balanco consolidado do seu workspace com dados reais.",
      emptyLabel: "Nenhum lancamento disponivel ainda.",
      ctaLabel: "Novo lancamento",
      favorite: true,
      aliases: ["balanco"],
      manager: "financial",
    },
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
    status: "active",
    route: { app: "/app/conversas/documentos", portal: "/portal/documentos" },
    destination: { app: "/app/novo/documento", portal: "/portal/documentos" },
    app: {
      subtitle: "Mantenha os documentos importantes da agencia organizados.",
      emptyLabel: "Nenhum documento disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo documento",
    },
    portal: {
      description: "Centralize documentos reais do seu workspace.",
      emptyLabel: "Nenhum documento disponivel ainda.",
      ctaLabel: "Novo documento",
      aliases: ["documentos", "propostas", "relatorios"],
      manager: "documents",
      documentFilterType: "arquivos",
    },
  },
  {
    key: "arquivos",
    label: "Arquivos",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
    status: "active",
    route: { app: "/app/conversas/arquivos", portal: "/portal/arquivos" },
    destination: { app: "/app/novo/documento", portal: "/portal/arquivos" },
    app: {
      subtitle: "Centralize arquivos e referencias da agencia.",
      emptyLabel: "Nenhum arquivo disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo arquivo",
    },
    portal: {
      description: "Centralize arquivos reais do seu workspace.",
      emptyLabel: "Nenhum arquivo disponivel ainda.",
      ctaLabel: "Novo arquivo",
      aliases: ["arquivos"],
      manager: "documents",
      documentFilterType: "arquivos",
    },
  },
  {
    key: "fornecedores",
    label: "Fornecedores",
    icon: UsersRound,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    status: "soon",
    route: { app: "/app/conversas/fornecedores", portal: "/portal/equipe" },
    destination: { app: "/app/novo/fornecedor", portal: "/portal/equipe" },
    app: {
      subtitle: "Acompanhe parceiros, operadoras e contatos chave.",
      emptyLabel: "Nenhum fornecedor disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo fornecedor",
    },
    portal: {
      description: "Organize fornecedores, parceiros e contatos da operacao.",
      emptyLabel: "Nenhum fornecedor registrado ainda.",
      ctaLabel: "Novo fornecedor",
      aliases: ["equipe"],
      manager: "suppliers",
    },
  },
  {
    key: "agenda",
    label: "Agenda",
    icon: Video,
    color: "#ef4444",
    bg: "#fee2e2",
    status: "soon",
    route: { app: "/app/conversas/agenda", portal: "/portal/reunioes" },
    destination: { app: "/app/novo/agenda", portal: "/portal/reunioes" },
    app: {
      subtitle: "Visualize compromissos e proximos atendimentos.",
      emptyLabel: "Nenhum compromisso disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo compromisso",
    },
    portal: {
      description: "Organize reunioes, compromissos e acompanhamentos da agencia.",
      emptyLabel: "Nenhum compromisso registrado ainda.",
      ctaLabel: "Novo compromisso",
      ctaDisabled: true,
      favorite: true,
      aliases: ["reunioes"],
    },
  },
  {
    key: "relatorios",
    label: "Relatorios",
    icon: BarChart3,
    color: "#f97316",
    bg: "#ffedd5",
    status: "active",
    route: { app: "/app/conversas/relatorios", portal: "/portal/relatorios" },
    destination: { app: "/app/novo/relatorio", portal: "/portal/relatorios" },
    app: {
      subtitle: "Consulte indicadores e visoes consolidadas da operacao.",
      emptyLabel: "Nenhum relatorio disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo relatorio",
    },
    portal: {
      description: "Acompanhe relatorios reais salvos no seu workspace.",
      emptyLabel: "Nenhum relatorio disponivel ainda.",
      ctaLabel: "Novo relatorio",
      aliases: ["relatorios"],
      manager: "documents",
      documentFilterType: "relatorios",
    },
  },
  {
    key: "recibos",
    label: "Recibos",
    icon: FileText,
    color: "#f97316",
    bg: "#ffedd5",
    status: "active",
    route: { app: "/app/conversas/recibos", portal: "/portal/recibos" },
    destination: { app: "/app/novo/documento", portal: "/portal/recibos" },
    app: {
      subtitle: "Organize recibos e comprovantes da agencia.",
      emptyLabel: "Nenhum recibo disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo recibo",
    },
    portal: {
      description: "Centralize recibos reais do seu workspace.",
      emptyLabel: "Nenhum recibo disponivel ainda.",
      ctaLabel: "Novo recibo",
      aliases: ["recibos"],
      manager: "documents",
      documentFilterType: "recibos",
    },
  },
  {
    key: "notas-fiscais",
    label: "Notas fiscais",
    icon: FileText,
    color: "#f97316",
    bg: "#ffedd5",
    status: "active",
    route: { app: "/app/conversas/notas-fiscais", portal: "/portal/notas-fiscais" },
    destination: { app: "/app/novo/documento", portal: "/portal/notas-fiscais" },
    app: {
      subtitle: "Organize notas fiscais e referencias de cobranca da agencia.",
      emptyLabel: "Nenhuma nota fiscal disponivel nesta sessao por enquanto.",
      ctaLabel: "Nova nota fiscal",
    },
    portal: {
      description: "Centralize notas fiscais reais do seu workspace.",
      emptyLabel: "Nenhuma nota fiscal disponivel ainda.",
      ctaLabel: "Nova nota fiscal",
      aliases: ["notas-fiscais"],
      manager: "documents",
      documentFilterType: "notas-fiscais",
    },
  },
  {
    key: "integracoes",
    label: "Integracoes",
    icon: Link2,
    color: "#6b7280",
    bg: "#f3f4f6",
    status: "soon",
    route: { app: "/app/conversas/integracoes", portal: "/portal/integracoes" },
    destination: { app: "/app/novo/integracao", portal: "/portal/integracoes" },
    app: {
      subtitle: "Conecte sistemas e acompanhe configuracoes externas.",
      emptyLabel: "Nenhuma integracao disponivel nesta sessao por enquanto.",
      ctaLabel: "Nova integracao",
    },
    portal: {
      description: "Conecte sistemas e acompanhe configuracoes externas da agencia.",
      emptyLabel: "Nenhuma integracao disponivel ainda.",
      ctaLabel: "Nova integracao",
      ctaDisabled: true,
    },
  },
  {
    key: "studio-ia",
    label: "Studio IA",
    icon: Sparkles,
    color: "#7c3aed",
    bg: "#f3e8ff",
    status: "active",
    route: { app: "/app/conversas/studio-ia", portal: "/portal/studio-ia" },
    destination: { app: "/app/conversas/studio-ia", portal: "/portal/studio-ia" },
    app: {
      subtitle: "Organize criativos, imagens, videos e campanhas em uma conversa contextual unica.",
      emptyLabel: "Nenhuma conversa do Studio IA disponivel nesta sessao por enquanto.",
      ctaLabel: "Abrir Studio IA",
    },
    portal: {
      description: "Centralize criativos, imagens, videos e campanhas em uma base visual do Studio IA.",
      emptyLabel: "Nenhum item do Studio IA disponivel ainda.",
      ctaLabel: "Abrir Studio IA",
      aliases: ["studio-ia"],
      ctaDisabled: false,
    },
  },
  {
    key: "configuracoes",
    label: "Configuracoes",
    icon: Settings,
    color: "#6b7280",
    bg: "#f3f4f6",
    status: "soon",
    route: { app: "/app/conversas/configuracoes", portal: "/portal/configuracoes" },
    destination: { app: "/app/voce", portal: "/portal/configuracoes" },
    app: {
      subtitle: "Ajuste preferencias e parametros da sua agencia.",
      emptyLabel: "Nenhuma configuracao disponivel nesta sessao por enquanto.",
      ctaLabel: "Abrir configuracoes",
    },
    portal: {
      description: "Gerencie preferencias, agencia e notificacoes do portal.",
      emptyLabel: "Nenhuma configuracao adicional disponivel ainda.",
      ctaLabel: "Abrir configuracoes",
      ctaDisabled: true,
    },
  },
  {
    key: "roteiros",
    label: "Roteiros",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
    status: "soon",
    route: { app: "/app/conversas/roteiros", portal: "/portal/roteiros" },
    destination: { app: "/app/novo/roteiro", portal: "/portal/roteiros" },
    app: {
      subtitle: "Monte roteiros e sugestoes para as viagens.",
      emptyLabel: "Nenhum roteiro disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo roteiro",
    },
    portal: {
      description: "Monte roteiros e sugestoes de experiencia da agencia.",
      emptyLabel: "Nenhum roteiro disponivel ainda.",
      ctaLabel: "Novo roteiro",
      ctaDisabled: true,
    },
  },
  {
    key: "atendimentos",
    label: "Atendimentos",
    icon: LifeBuoy,
    color: "#6b7280",
    bg: "#f3f4f6",
    status: "soon",
    route: { app: "/app/conversas/atendimentos", portal: "/portal/atendimentos" },
    destination: { app: "/app/novo/atendimento", portal: "/portal/atendimentos" },
    app: {
      subtitle: "Registre interacoes e acompanhe o historico do cliente.",
      emptyLabel: "Nenhum atendimento disponivel nesta sessao por enquanto.",
      ctaLabel: "Novo atendimento",
    },
    portal: {
      description: "Acompanhe atendimentos e demandas operacionais.",
      emptyLabel: "Nenhum atendimento registrado ainda.",
      ctaLabel: "Novo atendimento",
      ctaDisabled: true,
    },
  },
  {
    key: "advisor",
    label: "Advisor",
    icon: Headphones,
    color: "#4f46e5",
    bg: "#eef2ff",
    status: "active",
    premiumExpansion: true,
    route: { app: "/app/conversas/advisor", portal: "/portal/advisor" },
    destination: { app: "/app/conversas/advisor", portal: "/app/conversas/advisor" },
    app: {
      subtitle: "Conversa contextual do Advisor para orientar analises e proximos passos.",
      emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o Advisor.",
      ctaLabel: "Abrir conversa",
    },
    portal: {
      description: "Modulo do Advisor com acesso direto a conversa contextual do workspace.",
      emptyLabel: "Abra a conversa do Advisor para centralizar analises e orientacoes.",
      ctaLabel: "Abrir conversa",
      aliases: ["advisor"],
      ctaDisabled: false,
    },
  },
  {
    key: "agent",
    label: "Agent",
    icon: Shield,
    color: "#2563eb",
    bg: "#eef6ff",
    status: "active",
    premiumExpansion: true,
    route: { app: "/app/conversas/agent", portal: "/portal/agent" },
    destination: { app: "/app/conversas/agent", portal: "/app/conversas/agent" },
    app: {
      subtitle: "Conversa contextual do Agent para organizar atendimentos e operacoes assistidas.",
      emptyLabel: "Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o Agent.",
      ctaLabel: "Abrir conversa",
    },
    portal: {
      description: "Modulo do Agent com acesso direto a conversa contextual do workspace.",
      emptyLabel: "Abra a conversa do Agent para centralizar atendimentos e execucoes assistidas.",
      ctaLabel: "Abrir conversa",
      aliases: ["agent"],
      ctaDisabled: false,
    },
  },
]

export const travelProAreasByKey = Object.fromEntries(travelProAreas.map((area) => [area.key, area])) as Record<TravelProAreaKey, TravelProArea>

export const travelProPortalAreasBySlug = Object.fromEntries(
  travelProAreas.flatMap((area) => [area.route.portal.replace("/portal/", ""), ...(area.portal.aliases ?? [])].map((slug) => [slug, area] as const)),
) as Record<string, TravelProArea>
