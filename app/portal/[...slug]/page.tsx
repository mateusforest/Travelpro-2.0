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
    title: "Conversas",
    description: "Acompanhe conversas e solicitacoes do portal em um so lugar.",
    ctaLabel: "Nova conversa",
    emptyLabel: "Nenhuma conversa registrada ainda.",
    listHref: "/portal/conversas",
  },
  cadastros: {
    title: "Cadastros",
    description: "Gerencie clientes, contatos e relacionamentos.",
    ctaLabel: "Novo cliente",
    emptyLabel: "Nenhum cadastro disponivel ainda.",
    listHref: "/portal/cadastros",
  },
  operacoes: {
    title: "Operacoes",
    description: "Organize processos, atendimentos e fluxos operacionais.",
    ctaLabel: "Nova operacao",
    emptyLabel: "Nenhuma operacao cadastrada ainda.",
    listHref: "/portal/operacoes",
  },
  vendas: {
    title: "Vendas",
    description: "Acompanhe propostas, pipeline e desempenho comercial.",
    ctaLabel: "Nova proposta",
    emptyLabel: "Nenhuma oportunidade registrada ainda.",
    listHref: "/portal/vendas",
  },
  documentos: {
    title: "Documentos",
    description: "Centralize documentos, termos e contratos da operacao.",
    ctaLabel: "Novo documento",
    emptyLabel: "Nenhum documento disponivel ainda.",
    listHref: "/portal/documentos",
  },
  reunioes: {
    title: "Reunioes",
    description: "Organize reunioes, gravacoes e resumos do COS Meet.",
    ctaLabel: "Nova reuniao",
    emptyLabel: "Nenhuma reuniao registrada ainda.",
    listHref: "/portal/reunioes",
  },
  relatorios: {
    title: "Relatorios",
    description: "Visualize relatorios e indicadores do seu negocio.",
    ctaLabel: "Novo relatorio",
    emptyLabel: "Nenhum relatorio disponivel ainda.",
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
          description="Gerencie clientes e relacionamentos reais do seu workspace."
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
          title="Operacoes"
          description="Organize processos, atendimentos e fluxos operacionais com dados reais."
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
          title="Reunioes"
          description="Gerencie gravacoes, resumos e proximos passos reais do COS Meet."
          variant="portal"
        />
      </div>
    )
  }

  const meta = SECTION_META[key] ?? {
    title: titleize(key),
    description: "Gerencie esta area do portal com busca, filtros e acao principal.",
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
