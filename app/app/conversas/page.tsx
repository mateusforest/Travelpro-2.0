"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  FolderOpen,
  Video,
  Settings,
  FileText,
  UsersRound,
} from "lucide-react"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { useAppInteractions } from "@/components/app/app-interactions"
import { areaConfigs, slug } from "@/lib/area-configs"

type Conversation = {
  icon: typeof Users
  label: string
  href: string
  lastMessage: string
  time: string
  count: number
  color: string
  bgColor: string
  subsections: string[]
}

const baseConversations: Conversation[] = [
  { icon: Users, label: "Clientes", href: "/app/conversas/cadastros", lastMessage: "Sem registros", time: "-", count: 0, color: "#ec4899", bgColor: "#fce7f3", subsections: areaConfigs.cadastros.subsections },
  { icon: Briefcase, label: "Viagens", href: "/app/conversas/operacoes", lastMessage: "Sem registros", time: "-", count: 0, color: "#8b5cf6", bgColor: "#ede9fe", subsections: areaConfigs.operacoes.subsections },
  { icon: TrendingUp, label: "Cotações", href: "/app/conversas/vendas", lastMessage: "Conversa contextual pronta", time: "-", count: 0, color: "#3b82f6", bgColor: "#dbeafe", subsections: areaConfigs.vendas.subsections },
  { icon: FileText, label: "Contratos", href: "/app/conversas/documentos/contratos", lastMessage: "Documentos de viagem", time: "-", count: 0, color: "#ef4444", bgColor: "#fee2e2", subsections: [] },
  { icon: Video, label: "Reservas", href: "/app/conversas/operacoes/reservas", lastMessage: "Chat contextual pronto", time: "-", count: 0, color: "#0ea5e9", bgColor: "#e0f2fe", subsections: [] },
  { icon: DollarSign, label: "Financeiro", href: "/app/conversas/financeiro", lastMessage: "Sem registros", time: "-", count: 0, color: "#22c55e", bgColor: "#dcfce7", subsections: areaConfigs.financeiro.subsections },
  { icon: FolderOpen, label: "Documentos", href: "/app/conversas/documentos", lastMessage: "Sem registros", time: "-", count: 0, color: "#f97316", bgColor: "#ffedd5", subsections: areaConfigs.documentos.subsections },
  { icon: UsersRound, label: "Fornecedores", href: "/app/conversas/cadastros/fornecedores", lastMessage: "Parceiros e operadoras", time: "-", count: 0, color: "#0ea5e9", bgColor: "#e0f2fe", subsections: [] },
  { icon: Video, label: "Agenda", href: "/app/conversas/reunioes", lastMessage: "Sem registros", time: "-", count: 0, color: "#ef4444", bgColor: "#fee2e2", subsections: areaConfigs.reunioes.subsections },
  { icon: FolderOpen, label: "Relatórios", href: "/app/conversas/documentos/relatorios", lastMessage: "Indicadores e análises", time: "-", count: 0, color: "#f97316", bgColor: "#ffedd5", subsections: [] },
  { icon: Settings, label: "Integrações", href: "/app/conversas/sistema/integracoes", lastMessage: "Conexões externas", time: "-", count: 0, color: "#6b7280", bgColor: "#f3f4f6", subsections: [] },
  { icon: Settings, label: "Configurações", href: "/app/conversas/sistema", lastMessage: "Configurações e logs", time: "-", count: 0, color: "#6b7280", bgColor: "#f3f4f6", subsections: areaConfigs.sistema.subsections },
]

export default function ConversasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const { summary } = useOperationsDashboard()
  const router = useRouter()
  const { openFilters } = useAppInteractions()

  const conversations = useMemo(
    () =>
      baseConversations.map((conversation) => {
        if (conversation.label === "Clientes") {
          const count = summary?.clientsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 cliente" : count > 1 ? `${count} clientes` : "Sem registros" }
        }

        if (conversation.label === "Viagens") {
          const count = summary?.operationsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 viagem" : count > 1 ? `${count} viagens` : "Sem registros" }
        }

        if (conversation.label === "Financeiro") {
          const count = summary?.financial.entriesCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 lançamento" : count > 1 ? `${count} lançamentos` : "Sem registros" }
        }

        if (conversation.label === "Documentos") {
          const count = summary?.documentsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 documento" : count > 1 ? `${count} documentos` : "Sem registros" }
        }

        if (conversation.label === "Agenda") {
          const count = summary?.meetingsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 atendimento" : count > 1 ? `${count} atendimentos` : "Sem registros" }
        }

        return conversation
      }),
    [summary],
  )

  const filtered = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [conversations, searchQuery],
  )

  return (
    <div className="px-4 py-4">
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-0.5">Conversas</h1>
        <p className="text-sm text-gray-500">Todas as áreas da sua operação em um só lugar.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>
        <button onClick={openFilters} className="flex items-center gap-1.5 px-3 py-2.5 bg-white rounded-xl border border-gray-200">
          <SlidersHorizontal className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtrar</span>
        </button>
      </motion.div>

      <div className="space-y-1">
        {filtered.map((conversation, index) => {
          const isOpen = expanded === conversation.label
          const conversationHref = conversation.href

          return (
            <motion.div
              key={conversation.label}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => {
                  if (conversation.subsections.length > 0) {
                    setExpanded(isOpen ? null : conversation.label)
                    return
                  }
                  router.push(conversationHref)
                }}
                className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conversation.bgColor }}>
                  <conversation.icon className="w-5 h-5" style={{ color: conversation.color }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-[#0a0a0a] text-sm">{conversation.label}</span>
                    <span className="text-xs text-gray-400">{conversation.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate pr-2">{conversation.lastMessage}</span>
                    {conversation.count > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0a0a] px-1.5 text-[11px] text-white">
                        {conversation.count}
                      </span>
                    )}
                  </div>
                </div>
                {conversation.subsections.length > 0 ? (
                  <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && conversation.subsections.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-50"
                  >
                    <div className="p-2 pl-4">
                      {conversation.subsections.map((subsection) => (
                        <Link
                          key={subsection}
                          href={`${conversation.href}/${slug(subsection)}`}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{subsection}</span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
