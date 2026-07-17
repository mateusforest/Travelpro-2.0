"use client"

import { use } from "react"
import { Bot, BriefcaseBusiness } from "lucide-react"
import { PortalHeader } from "@/components/portal/portal-header"
import { PortalModulePage } from "@/components/portal/portal-module-page"
import { PremiumExpansionHome } from "@/components/portal/premium-expansion-home"
import { ClientsManager } from "@/components/operations/clients-manager"
import { BookingsManager } from "@/components/operations/bookings-manager"
import { ContractsManager } from "@/components/operations/contracts-manager"
import { DocumentsManager } from "@/components/operations/documents-manager"
import { FinancialManager } from "@/components/operations/financial-manager"
import { QuotesManager } from "@/components/operations/quotes-manager"
import { SuppliersManager } from "@/components/operations/suppliers-manager"
import { TripsManager } from "@/components/operations/trips-manager"
import { travelProPortalAreasBySlug } from "@/lib/travelpro-areas"

const EXTRA_SECTION_META: Record<
  string,
  { title: string; description: string; ctaLabel: string; emptyLabel: string; listHref: string; ctaDisabled?: boolean }
> = {
  propostas: {
    title: "Propostas",
    description: "Gerencie propostas comerciais do portal.",
    ctaLabel: "Nova proposta",
    emptyLabel: "Nenhuma proposta cadastrada ainda.",
    listHref: "/portal/propostas",
  },
  balanco: {
    title: "Balanco",
    description: "Visualize o balanco consolidado do periodo.",
    ctaLabel: "Novo lancamento",
    emptyLabel: "Nenhum balanco disponivel ainda.",
    listHref: "/portal/financeiro/balanco",
  },
}

const DOCUMENT_MANAGER_META: Record<string, { title: string; description: string; filterType: string }> = {
  documentos: {
    title: "Documentos",
    description: "Centralize documentos reais do seu workspace.",
    filterType: "arquivos",
  },
  propostas: {
    title: "Propostas",
    description: "Centralize propostas reais e acompanhe seus rascunhos e envios.",
    filterType: "propostas",
  },
  relatorios: {
    title: "Relatorios",
    description: "Acompanhe relatorios reais salvos no seu workspace.",
    filterType: "relatorios",
  },
}

function buildConversationHref(baseHref: string, prompt: string) {
  return `${baseHref}?prompt=${encodeURIComponent(prompt)}&autoSend=1`
}

const ADVISOR_PLAN_DIALOG = {
  title: "Assinatura do Advisor",
  eyebrow: "Plano premium",
  description: "Conheca a frente premium do Advisor antes da assinatura. Esta e uma experiencia visual, sem pagamento real nesta etapa.",
  capabilities: [
    "Orientar analises estrategicas da agencia com foco em crescimento, atendimento e prioridades.",
    "Abrir conversas contextualizadas para cenarios comerciais e operacionais mais sensiveis.",
    "Centralizar o acesso ao Advisor dentro do Portal e do chat existente do TravelPro.",
  ],
  limitations: [
    "Nao inclui cobranca real nem ativacao automatica do plano.",
    "Nao altera o COS nem cria novos fluxos de IA nesta etapa.",
  ],
  planLabel: "Advisor Premium",
  priceLabel: "R$ 0,00 / placeholder",
  actionLabel: "Assinar Advisor",
  helperText: "Botao visual de assinatura. A contratacao real ainda nao foi implementada.",
} as const

const AGENT_PLAN_DIALOG = {
  title: "Ativacao premium do Agent",
  eyebrow: "Plano premium",
  description: "Veja como o Agent pode operar na agencia antes de seguir para uma ativacao real. Esta e apenas a base visual da experiencia.",
  capabilities: [
    "Organizar rotinas operacionais e abrir conversas contextualizadas para execucao assistida.",
    "Preparar a frente operacional para futuras configuracoes de atendimento e canais.",
    "Concentrar o acesso do Agent na mesma arquitetura do Portal e do chat atual.",
  ],
  limitations: [
    "Nao ativa WhatsApp nem qualquer integracao externa neste momento.",
    "Nao executa assinatura real, pagamento ou provisionamento automatico.",
  ],
  requirements: [
    "Definir o escopo operacional desejado para o Agent no workspace.",
    "Revisar os canais e processos que serao preparados futuramente.",
    "Concluir a contratacao quando a camada comercial estiver disponivel.",
  ],
  planLabel: "Agent Premium",
  priceLabel: "R$ 0,00 / placeholder",
  actionLabel: "Assinar Agent",
  helperText: "Botao visual de assinatura. Nenhuma ativacao real sera executada por enquanto.",
} as const

const AGENT_WHATSAPP_DIALOG = {
  title: "Configuracao visual do Agent",
  eyebrow: "WhatsApp e operacao",
  description: "Esta area prepara o estado visual de configuracao do Agent para atendimento via WhatsApp, sem integracao real nesta etapa.",
  capabilities: [
    "Exibir o estado atual do canal antes da ativacao real.",
    "Antecipar o checklist de preparo operacional do Agent.",
    "Concentrar as informacoes minimas para a futura configuracao do canal.",
  ],
  limitations: [
    "WhatsApp ainda nao esta conectado ao TravelPro.",
    "Nenhuma mensagem sera enviada a clientes a partir desta tela.",
  ],
  requirements: [
    "Canal ainda nao configurado.",
    "Numero oficial e politicas de atendimento ainda pendentes.",
    "Fluxos e mensagens padrao ainda serao definidos futuramente.",
  ],
  planLabel: "Configuração do Agent",
  priceLabel: "Sem custo nesta etapa",
  actionLabel: "Salvar configuracao visual",
  helperText: "Somente estado visual de configuracao. Nenhum dado externo sera salvo.",
} as const

const PREMIUM_EXPANSION_META = {
  advisor: {
    title: "Advisor",
    eyebrow: "Consultor Estrategico",
    description: "Use o Advisor como frente premium para orientar crescimento, atendimento e decisoes estrategicas da sua agencia.",
    accentColor: "#4f46e5",
    accentBg: "#eef2ff",
    icon: BriefcaseBusiness,
    primaryAction: {
      label: "Conhecer planos",
      dialog: ADVISOR_PLAN_DIALOG,
      style: "primary",
    },
    secondaryAction: {
      label: "Conversar com o Advisor",
      href: buildConversationHref("/app/conversas/advisor", "Quero uma analise estrategica da minha agencia e um plano de acao prioritario."),
      style: "secondary",
    },
    ctas: [
      {
        label: "Vender mais",
        href: buildConversationHref("/app/conversas/advisor", "Quero vender mais. Analise minha agencia e sugira as prioridades comerciais mais importantes agora."),
        description: "Iniciar conversa com foco em crescimento comercial e prioridades de venda.",
      },
      {
        label: "Resolver problemas com clientes",
        href: buildConversationHref("/app/conversas/advisor", "Preciso resolver problemas com clientes. Me ajude a organizar a situacao e definir a melhor abordagem."),
        description: "Abrir uma conversa para destravar conflitos, pendencias e recuperacao de relacionamento.",
      },
      {
        label: "Melhorar atendimento",
        href: buildConversationHref("/app/conversas/advisor", "Quero melhorar o atendimento da minha agencia. Me mostre por onde comecar."),
        description: "Levar o Advisor direto para uma analise de atendimento e experiencia do cliente.",
      },
      {
        label: "Analisar a agencia",
        href: buildConversationHref("/app/conversas/advisor", "Quero analisar minha agencia como um todo e identificar gargalos, riscos e oportunidades."),
        description: "Comecar uma leitura mais ampla da operacao com foco em diagnostico estrategico.",
      },
      {
        label: "Crescer no internacional",
        href: buildConversationHref("/app/conversas/advisor", "Quero crescer no internacional. Me ajude a estruturar os proximos passos da agencia."),
        description: "Abrir uma conversa contextual sobre expansao internacional e posicionamento.",
      },
    ],
    placeholderCard: {
      title: "Insights da agencia",
      description: "Area preparada para concentrar sinais e leituras estrategicas da agencia. Por enquanto, permanece como placeholder visual.",
    },
  },
  agent: {
    title: "Agent",
    eyebrow: "Agente Operacional",
    description: "Use o Agent como frente premium para executar rotinas operacionais com contexto e continuidade dentro do TravelPro.",
    accentColor: "#2563eb",
    accentBg: "#eef6ff",
    icon: Bot,
    primaryAction: {
      label: "Ativar Agent",
      dialog: AGENT_PLAN_DIALOG,
      style: "primary",
    },
    secondaryAction: {
      label: "Conversar com o Agent",
      href: buildConversationHref("/app/conversas/agent", "Quero conversar com o Agent sobre a minha operacao atual."),
      style: "secondary",
    },
    ctas: [
      {
        label: "Configurar WhatsApp",
        dialog: AGENT_WHATSAPP_DIALOG,
        description: "Abrir a configuracao visual do canal sem ativar integracoes reais.",
        footerLabel: "Abrir configuracao",
      },
      {
        label: "Atender clientes",
        href: buildConversationHref("/app/conversas/agent", "Quero organizar o Agent para apoiar atendimentos a clientes com mais continuidade."),
        description: "Iniciar uma conversa com foco em rotina de atendimento e acompanhamento.",
      },
      {
        label: "Cadastrar clientes",
        href: buildConversationHref("/app/conversas/agent", "Quero usar o Agent para ajudar no cadastro e organizacao de clientes."),
        description: "Comecar pelo fluxo operacional de cadastros e atualizacao de base.",
      },
      {
        label: "Executar tarefas",
        href: buildConversationHref("/app/conversas/agent", "Quero usar o Agent para executar tarefas operacionais com mais consistencia."),
        description: "Levar o Agent direto para um contexto de execucao assistida.",
      },
      {
        label: "Organizar operacoes",
        href: buildConversationHref("/app/conversas/agent", "Quero organizar melhor minhas operacoes e entender como o Agent pode apoiar esse fluxo."),
        description: "Abrir uma conversa contextual sobre organizacao operacional da agencia.",
      },
    ],
    statusCard: {
      title: "Status do Agent",
      badge: "Nao ativado",
      description: "O Agent ainda nao esta ativado neste workspace. Esta area prepara o estado visual e o ponto de partida sem implementar integracao com WhatsApp agora.",
      items: [
        "WhatsApp: nao configurado.",
        "Fluxos operacionais: em preparacao visual.",
        "Assinatura premium: pendente.",
      ],
    },
  },
} as const

function titleize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
}

export default function PortalSectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params)
  const key = slug[slug.length - 1]
  const area = travelProPortalAreasBySlug[key]
  const premiumExpansion = PREMIUM_EXPANSION_META[key as keyof typeof PREMIUM_EXPANSION_META]

  if (premiumExpansion) {
    return <PremiumExpansionHome {...premiumExpansion} />
  }

  if (area?.portal.manager === "clients") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <ClientsManager
          key={`clients:${key}`}
          title={area.label}
          description="Gerencie clientes e relacionamentos reais da sua agencia."
          variant="portal"
        />
      </div>
    )
  }

  if (area?.portal.manager === "trips") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <TripsManager
          key={`trips:${key}`}
          title={area.label}
          description="Gerencie viagens reais da sua agencia e vincule ao cliente quando necessario."
          variant="portal"
        />
      </div>
    )
  }

  if (area?.portal.manager === "quotes") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <QuotesManager
          key={`quotes:${key}`}
          title={area.label}
          description="Gerencie cotacoes reais da sua agencia e vincule clientes e viagens quando necessario."
          variant="portal"
        />
      </div>
    )
  }

  if (area?.portal.manager === "bookings") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <BookingsManager
          key={`bookings:${key}`}
          title={area.label}
          description="Gerencie reservas reais da sua agencia e acompanhe clientes, viagens e fornecedores."
          variant="portal"
        />
      </div>
    )
  }

  if (area?.portal.manager === "contracts") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <ContractsManager
          key={`contracts:${key}`}
          title={area.label}
          description="Gerencie contratos reais da sua agencia e vincule clientes, viagens e cotacoes."
          variant="portal"
        />
      </div>
    )
  }

  if (area?.portal.manager === "suppliers") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <SuppliersManager
          key={`suppliers:${key}`}
          title={area.label}
          description="Gerencie fornecedores reais da sua agencia com os principais dados de contato."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "balanco" || area?.portal.manager === "financial") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <FinancialManager
          key={`financial:${key}`}
          title={key === "balanco" ? "Balanco" : area?.label ?? "Financeiro"}
          description="Visualize o balanco consolidado do seu workspace com dados reais."
          variant="portal"
        />
      </div>
    )
  }

  if (area?.portal.manager === "documents") {
    const documentMeta = DOCUMENT_MANAGER_META[key] ?? {
      title: area.label,
      description: area.portal.description,
      filterType: area.portal.documentFilterType ?? "documentos",
    }

    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <DocumentsManager
          key={`documents:${key}:${documentMeta.filterType}`}
          title={documentMeta.title}
          description={documentMeta.description}
          variant="portal"
          filterType={documentMeta.filterType}
        />
      </div>
    )
  }

  if (area) {
    return (
      <PortalModulePage
        title={area.label}
        description={area.portal.description}
        ctaLabel={area.portal.ctaLabel}
        emptyLabel={area.portal.emptyLabel}
        listHref={area.route.portal}
        ctaHref={area.portal.ctaDisabled ? undefined : area.destination.portal}
        ctaDisabled={area.portal.ctaDisabled}
      />
    )
  }

  const meta = EXTRA_SECTION_META[key] ?? {
    title: titleize(key),
    description: "Gerencie esta area da TravelPro com busca, filtros e acao principal.",
    ctaLabel: "Nova acao",
    emptyLabel: "Nenhum registro disponivel ainda.",
    listHref: `/portal/${slug.join("/")}`,
    ctaDisabled: true,
  }

  return (
    <PortalModulePage
      title={meta.title}
      description={meta.description}
      ctaLabel={meta.ctaLabel}
      emptyLabel={meta.emptyLabel}
      listHref={meta.listHref}
      ctaDisabled={meta.ctaDisabled}
    />
  )
}
