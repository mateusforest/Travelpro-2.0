"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, SlidersHorizontal, X, Clock, Tag, Plug, Inbox } from "lucide-react"
import { getConnectHistoryAction } from "@/actions/connect"
import { useConnect } from "@/components/connect/connect-store"
import { useSupport } from "@/components/support/support-context"
import { humanizeActivityAction } from "@/lib/activity/humanize"

type HistoryItem = {
  id: string
  area: string
  action: string
  description: string
  createdAt: string | null
}

function formatDate(value: string | null) {
  if (!value) return "Agora"

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function ConnectHistoricoPage() {
  const { hasSources, openModal, sources } = useConnect()
  const { refreshKey } = useSupport()
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<HistoryItem[]>([])
  const [activeFilter, setActiveFilter] = useState("todos")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<HistoryItem | null>(null)

  useEffect(() => {
    let active = true

    setIsLoading(true)
    void getConnectHistoryAction().then((result) => {
      if (!active) return

      if (result.success) {
        setItems(result.logs ?? [])
      } else {
        setItems([])
      }

      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [refreshKey])

  const filters = useMemo(
    () => [
      { id: "todos", label: "Todos" },
      { id: "fontes", label: "Fontes" },
      { id: "sessoes", label: "Sessoes" },
      { id: "acoes", label: "Acoes" },
      { id: "suporte", label: "Suporte" },
      ...sources.map((source) => ({ id: source.id, label: source.name })),
    ],
    [sources],
  )

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.action} ${item.description}`.toLowerCase()
      const matchQuery = !query.trim() || text.includes(query.trim().toLowerCase())

      const matchFilter =
        activeFilter === "todos" ||
        (activeFilter === "fontes" && item.action.startsWith("connect_source_")) ||
        (activeFilter === "sessoes" && item.action.startsWith("connect_section_")) ||
        (activeFilter === "acoes" && item.action.startsWith("connect_action_")) ||
        (activeFilter === "suporte" && item.area === "support") ||
        item.description.toLowerCase().includes(filters.find((filter) => filter.id === activeFilter)?.label.toLowerCase() || "")

      return matchQuery && matchFilter
    })
  }, [activeFilter, filters, items, query])

  if (!hasSources && !isLoading) {
    return (
      <div className="min-h-full bg-white px-4 pb-28 pt-6">
        <h1 className="mb-1 text-2xl font-semibold text-[#0a0a0a]">Historico</h1>
        <p className="mb-8 text-gray-500">Acompanhe tudo o que o COS registrou das suas fontes.</p>

        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Inbox className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[#0a0a0a]">Nada por aqui ainda</h2>
          <p className="mb-6 max-w-xs leading-relaxed text-gray-500">
            Quando voce criar fontes, sessoes ou acoes, o historico real do Connect aparecera aqui.
          </p>
          <button
            onClick={() => openModal("system")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <Plug className="h-4 w-4" />
            Conectar primeira fonte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white px-4 pb-28 pt-6">
      <h1 className="mb-1 text-2xl font-semibold text-[#0a0a0a]">Historico</h1>
      <p className="mb-5 text-gray-500">Tudo o que o COS registrou das suas fontes e do suporte.</p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar no historico..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-gray-300 focus:outline-none"
        />
      </div>

      <div className="scrollbar-hide -mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
        </span>
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
              activeFilter === filter.id
                ? "bg-[#0a0a0a] text-white"
                : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <p className="max-w-xs text-gray-500">
            {query.trim() ? "Nenhum resultado para sua busca." : "Nenhuma atividade registrada ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => setSelected(item)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <Plug className="h-4 w-4 text-blue-600" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0a0a0a]">{humanizeActivityAction(item.action, item.description)}</p>
                <p className="truncate text-xs text-gray-500">{item.description}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-gray-400">{formatDate(item.createdAt)}</span>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                    <Plug className="h-5 w-5 text-blue-600" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#0a0a0a]">{humanizeActivityAction(selected.action, selected.description)}</h3>
                    <p className="text-sm text-gray-500">{selected.description}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2.5 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Horario:</span>
                  <span className="font-medium text-[#0a0a0a]">{formatDate(selected.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Area:</span>
                  <span className="font-medium text-[#0a0a0a]">{selected.area === "support" ? "Suporte" : "Connect"}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="mt-5 w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
