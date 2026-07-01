"use client"

import { use } from "react"
import { PortalHeader } from "@/components/portal/portal-header"
import { PortalModulePage } from "@/components/portal/portal-module-page"
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

function titleize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
}

export default function PortalSectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params)
  const key = slug[slug.length - 1]
  const area = travelProPortalAreasBySlug[key]

  if (area?.portal.manager === "clients") {
    return (
      <div className="flex h-full flex-1 flex-col">
        <PortalHeader />
        <ClientsManager
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
