"use client"

import { use } from "react"
import { PortalHeader } from "@/components/portal/portal-header"
import { PortalModulePage } from "@/components/portal/portal-module-page"
import { ClientsManager } from "@/components/operations/clients-manager"
import { DocumentsManager } from "@/components/operations/documents-manager"
import { FinancialManager } from "@/components/operations/financial-manager"
import { MeetingsManager } from "@/components/operations/meetings-manager"
import { OperationsManager } from "@/components/operations/operations-manager"

const SECTION_META: Record<string, { title: string; description: string; ctaLabel: string; emptyLabel: string; listHref: string }> = {
  conversas: {
    title: "Reservas",
    description: "Acompanhe reservas, confirmações e próximos passos da operação.",
    ctaLabel: "Nova reserva",
    emptyLabel: "Nenhuma reserva registrada ainda.",
    listHref: "/portal/conversas",
  },
  cadastros: {
    title: "Clientes",
    description: "Gerencie clientes, contatos e relacionamentos da agência.",
    ctaLabel: "Novo cliente",
    emptyLabel: "Nenhum cliente disponível ainda.",
    listHref: "/portal/cadastros",
  },
  operacoes: {
    title: "Contratos",
    description: "Organize contratos, etapas de assinatura e documentos vinculados.",
    ctaLabel: "Novo contrato",
    emptyLabel: "Nenhum contrato cadastrado ainda.",
    listHref: "/portal/operacoes",
  },
  vendas: {
    title: "Cotações",
    description: "Acompanhe cotações, propostas e oportunidades da agência.",
    ctaLabel: "Nova cotação",
    emptyLabel: "Nenhuma cotação registrada ainda.",
    listHref: "/portal/vendas",
  },
  documentos: {
    title: "Documentos",
    description: "Centralize documentos operacionais e comerciais da agência.",
    ctaLabel: "Novo documento",
    emptyLabel: "Nenhum documento disponível ainda.",
    listHref: "/portal/documentos",
  },
  reunioes: {
    title: "Agenda",
    description: "Organize reuniões, compromissos e acompanhamentos da agência.",
    ctaLabel: "Novo compromisso",
    emptyLabel: "Nenhum compromisso registrado ainda.",
    listHref: "/portal/reunioes",
  },
  relatorios: {
    title: "Relatorios",
    description: "Visualize relatórios e indicadores da sua agência.",
    ctaLabel: "Novo relatorio",
    emptyLabel: "Nenhum relatório disponível ainda.",
    listHref: "/portal/relatorios",
  },
  propostas: {
    title: "Propostas",
    description: "Gerencie propostas comerciais do portal.",
    ctaLabel: "Nova proposta",
    emptyLabel: "Nenhuma proposta cadastrada ainda.",
    listHref: "/portal/propostas",
  },
  contratos: {
    title: "Contratos",
    description: "Gerencie contratos e documentos formais.",
    ctaLabel: "Novo contrato",
    emptyLabel: "Nenhum contrato disponivel ainda.",
    listHref: "/portal/contratos",
  },
  atendimentos: {
    title: "Atendimentos",
    description: "Acompanhe atendimentos e demandas operacionais.",
    ctaLabel: "Novo atendimento",
    emptyLabel: "Nenhum atendimento registrado ainda.",
    listHref: "/portal/atendimentos",
  },
  balanco: {
    title: "Balanco",
    description: "Visualize o balanco consolidado do periodo.",
    ctaLabel: "Novo lancamento",
    emptyLabel: "Nenhum balanco disponivel ainda.",
    listHref: "/portal/financeiro/balanco",
  },
}

function titleize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
}

function metaForDocumentKey(key: string) {
  if (key === "contratos") {
    return {
      title: "Contratos",
      description: "Gerencie contratos reais do seu workspace.",
    }
  }

  if (key === "propostas") {
    return {
      title: "Propostas",
      description: "Centralize propostas reais e acompanhe seus rascunhos e envios.",
    }
  }

  if (key === "relatorios") {
    return {
      title: "Relatorios",
      description: "Acompanhe relatorios reais salvos no seu workspace.",
    }
  }

  return {
    title: "Documentos",
    description: "Centralize documentos reais do seu workspace.",
  }
}

export default function PortalSectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params)
  const key = slug[slug.length - 1]

  if (key === "cadastros") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <ClientsManager
          title="Clientes"
          description="Gerencie clientes e relacionamentos reais da sua agência."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "balanco") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <FinancialManager
          title="Balanco"
          description="Visualize o balanco consolidado do seu workspace com dados reais."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "operacoes") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <OperationsManager
          title="Contratos"
          description="Organize contratos, acompanhamentos e etapas da sua agência com dados reais."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "documentos" || key === "contratos" || key === "propostas" || key === "relatorios") {
    const meta = metaForDocumentKey(key)

    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <DocumentsManager
          title={meta.title}
          description={meta.description}
          variant="portal"
          filterType={key}
        />
      </div>
    )
  }

  if (key === "reunioes") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <MeetingsManager
          title="Agenda"
          description="Gerencie reuniões, resumos e próximos passos reais da TravelPro."
          variant="portal"
        />
      </div>
    )
  }

  const meta = SECTION_META[key] ?? {
    title: titleize(key),
    description: "Gerencie esta área da TravelPro com busca, filtros e ação principal.",
    ctaLabel: "Nova acao",
    emptyLabel: "Nenhum registro disponivel ainda.",
    listHref: `/portal/${slug.join("/")}`,
  }

  return (
    <PortalModulePage
      title={meta.title}
      description={meta.description}
      ctaLabel={meta.ctaLabel}
      emptyLabel={meta.emptyLabel}
      listHref={meta.listHref}
    />
  )
}
