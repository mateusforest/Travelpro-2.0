"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Briefcase,
  Clock,
  DollarSign,
  FolderOpen,
  Grid3X3,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Users,
  UsersRound,
  Video,
  X,
  TrendingUp,
} from "lucide-react"
import { getWorkspaceActivityLogsAction } from "@/actions/activity"
import { useAppInteractions } from "@/components/app/app-interactions"
import { humanizeActivityAction } from "@/lib/activity/humanize"

type ActivityItem = {
  id: string
  area: string
  action: string
  description: string
  createdAt: string | null
}

const filters = [
  { id: "todos", icon: Grid3X3, label: "Todos" },
  { id: "clients", icon: Users, label: "Clientes" },
  { id: "financeiro", icon: DollarSign, label: "Financeiro" },
  { id: "support", icon: LifeBuoy, label: "Atendimentos" },
  { id: "operacoes", icon: Briefcase, label: "Viagens" },
  { id: "vendas", icon: TrendingUp, label: "Cotações" },
  { id: "equipe", icon: UsersRound, label: "Fornecedores" },
  { id: "documentos", icon: FolderOpen, label: "Documentos" },
  { id: "reunioes", icon: Video, label: "Agenda" },
  { id: "sistema", icon: Settings, label: "Configurações" },
] as const

const actionLabels: Record<string, string> = {
  financial_entry_created: "Lançamento financeiro criado",
  financial_entry_updated: "Lançamento financeiro atualizado",
  financial_entry_deleted: "Lançamento financeiro removido",
  client_created: "Cliente criado",
  client_updated: "Cliente atualizado",
  client_archived: "Cliente arquivado",
  support_ticket_created: "Chamado de suporte aberto",
  support_message_created: "Mensagem enviada no suporte",
  master_support_reply: "Resposta enviada pela equipe TravelPro",
  operation_created: "Viagem criada",
  operation_updated: "Viagem atualizada",
  operation_archived: "Viagem arquivada",
  document_created: "Documento criado",
  document_updated: "Documento atualizado",
  document_archived: "Documento arquivado",
  meeting_created: "Atendimento criado",
  meeting_updated: "Atendimento atualizado",
  meeting_archived: "Atendimento arquivado",
  support_status_updated: "Status do suporte atualizado",
  support_priority_updated: "Prioridade do suporte atualizada",
  support_ticket_assigned: "Chamado de suporte atribuído",
}

function formatDateTime(value: string | null) {
  if (!value) return "Agora"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Agora"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function iconForArea(area: string) {
  if (area === "clients") return Users
  if (area === "financial") return DollarSign
  if (area === "support") return LifeBuoy
  if (area === "operations") return Briefcase
  if (area === "documents") return FolderOpen
  if (area === "meetings") return Video
  return Settings
}

function colorForArea(area: string) {
  if (area === "clients") return { color: "#3b82f6", bgColor: "#dbeafe" }
  if (area === "financial") return { color: "#22c55e", bgColor: "#dcfce7" }
  if (area === "support") return { color: "#6b7280", bgColor: "#f3f4f6" }
  if (area === "operations") return { color: "#8b5cf6", bgColor: "#ede9fe" }
  if (area === "documents") return { color: "#3b82f6", bgColor: "#dbeafe" }
  if (area === "meetings") return { color: "#ef4444", bgColor: "#fee2e2" }
  return { color: "#6b7280", bgColor: "#f3f4f6" }
}

function humanizeArea(area: string) {
  if (area === "clients") return "Clientes"
  if (area === "financial") return "Financeiro"
  if (area === "support") return "Atendimentos"
  if (area === "operations") return "Viagens"
  if (area === "documents") return "Documentos"
  if (area === "meetings") return "Agenda"
  return "Configurações"
}

export default function HistoricoPage() {
  const [activeFilter, setActiveFilter] = useState("todos")
  const [selected, setSelected] = useState<ActivityItem | null>(null)
  const [query, setQuery] = useState("")
  const [logs, setLogs] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { openFilters } = useAppInteractions()

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      const result = await getWorkspaceActivityLogsAction()

      if (result.error) {
        setError(result.error)
        setLogs([])
        setIsLoading(false)
        return
      }

      setLogs((result.logs ?? []) as ActivityItem[])
      setIsLoading(false)
    }

    void load()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesFilter =
        activeFilter === "todos" ||
        (activeFilter === "financeiro"
          ? log.area === "financial"
          : activeFilter === "operacoes"
            ? log.area === "operations"
            : activeFilter === "documentos"
              ? log.area === "documents"
              : activeFilter === "reunioes"
                ? log.area === "meetings"
                : log.area === activeFilter)

      const term = query.trim().toLowerCase()
      const matchesSearch = !term || [log.action, log.description].join(" ").toLowerCase().includes(term)

      return matchesFilter && matchesSearch
    })
  }, [activeFilter, logs, query])

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="mb-0.5 text-2xl font-bold text-[#0a0a0a]">Historico</h1>
        <p className="text-sm text-gray-500">Acompanhe tudo o que aconteceu na sua operacao.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no historico..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-300 focus:outline-none"
          />
        </div>
        <button onClick={openFilters} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </button>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-4 flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 whitespace-nowrap text-sm transition-colors ${
              activeFilter === filter.id ? "bg-[#0a0a0a] text-white" : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            <filter.icon className="h-4 w-4" />
            <span className="font-medium">{filter.label}</span>
          </button>
        ))}
      </motion.div>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando historico...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">Nenhum registro ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const Icon = iconForArea(log.area)
            const tone = colorForArea(log.area)
            return (
              <button
                key={log.id}
                onClick={() => setSelected(log)}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: tone.bgColor }}>
                  <Icon className="h-5 w-5" style={{ color: tone.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0a0a0a]">{humanizeActivityAction(log.action, log.description)}</p>
                  <p className="truncate text-sm text-gray-500">{log.description}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
              </button>
            )
          })}
        </div>
      )}

      {!isLoading && filteredLogs.length === 0 && (
        <div className="flex w-full items-center justify-center gap-2 py-3 text-gray-400">
          <RefreshCw className="h-4 w-4" />
          <span>Nenhum historico para carregar</span>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
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
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colorForArea(selected.area).bgColor }}>
                    {(() => {
                      const Icon = iconForArea(selected.area)
                      return <Icon className="h-5 w-5" style={{ color: colorForArea(selected.area).color }} />
                    })()}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#0a0a0a]">{humanizeActivityAction(selected.action, selected.description)}</h3>
                    <p className="text-sm text-gray-500">{selected.description}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full p-1.5 hover:bg-gray-100" aria-label="Fechar">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2.5 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Horario:</span>
                  <span className="font-medium text-[#0a0a0a]">{formatDateTime(selected.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Categoria:</span>
                  <span className="font-medium text-[#0a0a0a]">{humanizeArea(selected.area)}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="mt-5 w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
