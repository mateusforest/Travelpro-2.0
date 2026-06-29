"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Plug,
  Database,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Users,
  LifeBuoy,
} from "lucide-react"
import { useConnect } from "@/components/connect/connect-store"

const sourceTypeIcon: Record<string, typeof Database> = {
  ERP: Database,
  CRM: Users,
  Planilha: FileSpreadsheet,
  "E-mail": Mail,
  WhatsApp: MessageCircle,
  "Banco de dados": Database,
  API: Plug,
  "Portal interno": Database,
}

export default function ConnectConversasPage() {
  const { sources, hasSources, openModal, toast, isLoading } = useConnect()
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filteredSources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sources
    return sources
      .map((source) => ({
        ...source,
        sections: source.sections.filter(
          (section) =>
            section.name.toLowerCase().includes(query) ||
            source.name.toLowerCase().includes(query),
        ),
      }))
      .filter((source) => source.name.toLowerCase().includes(query) || source.sections.length > 0)
  }, [searchQuery, sources])

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="mb-0.5 text-2xl font-bold text-[#0a0a0a]">Conversas</h1>
        <p className="text-sm text-gray-500">As conversas se organizam conforme as fontes e sessoes do seu Connect.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar conversas..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-300 focus:outline-none"
          />
        </div>
        <button
          onClick={() => toast("Use a busca acima para localizar fontes e sessoes configuradas.")}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtrar</span>
        </button>
      </motion.div>

      <div className="space-y-1">
        <motion.div
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <Link href="/connect/conversas/suporte" className="flex items-center gap-3 p-3 transition-colors hover:bg-gray-50 active:bg-gray-100">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
              <LifeBuoy className="h-5 w-5 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0a0a0a]">Suporte</span>
                <span className="text-xs text-gray-400">Atendimento</span>
              </div>
              <span className="block truncate text-xs text-gray-500">
                Atendimento, duvidas, problemas tecnicos, plano, cobranca e integracoes.
              </span>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
          </Link>
        </motion.div>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-white" />
          ))
        ) : (
          filteredSources.map((source, index) => {
            const isOpen = expanded === source.id
            const Icon = sourceTypeIcon[source.sourceType] ?? Plug

            return (
              <motion.div
                key={source.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.06 + index * 0.03 }}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : source.id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-[#0a0a0a]">{source.name}</span>
                      <span className="text-xs text-gray-400">{source.sourceType}</span>
                    </div>
                    <span className="block truncate text-xs text-gray-500">
                      {source.sectionsCount > 0
                        ? `${source.sectionsCount} sessoes · ${source.actionsCount} acoes`
                        : "Nenhuma sessao criada ainda."}
                    </span>
                  </div>
                  {source.sections.length > 0 ? (
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-50"
                    >
                      <div className="space-y-1 p-2 pl-4">
                        {source.sections.length === 0 ? (
                          <button
                            onClick={() => openModal("section", { sourceId: source.id })}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
                          >
                            <span className="text-sm text-gray-700">Criar primeira sessao</span>
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </button>
                        ) : (
                          source.sections.map((section) => (
                            <Link
                              key={section.id}
                              href={`/connect/conversas/${source.id}/${section.id}`}
                              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
                            >
                              <span className="text-sm text-gray-700">{section.name}</span>
                              <ChevronRight className="h-4 w-4 text-gray-300" />
                            </Link>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      {!hasSources && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100">
            <Plug className="h-7 w-7 text-gray-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[#0a0a0a]">Suas conversas aparecerao aqui</h2>
          <p className="mb-6 max-w-xs text-sm leading-relaxed text-gray-500">
            Suas conversas aparecerao aqui quando voce criar uma fonte e organizar suas sessoes.
          </p>
          <button
            onClick={() => openModal("system")}
            className="flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <Plug className="h-4 w-4" /> Conectar primeira fonte
          </button>
        </motion.div>
      )}
    </div>
  )
}
