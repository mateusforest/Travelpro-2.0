"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  Users,
  Headphones,
  Shield,
} from "lucide-react"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { useAppInteractions } from "@/components/app/app-interactions"
import { ExpansionLaunchItem } from "@/components/expansions/expansion-launch-item"
import { expansionItems } from "@/lib/expansion-configs"
import { travelProAreas } from "@/lib/travelpro-areas"

type Conversation = {
  key: string
  icon: typeof Users
  label: string
  href: string
  lastMessage: string
  time: string
  count: number
  color: string
  bgColor: string
}

const baseConversations: Conversation[] = travelProAreas.filter((area) => !area.premiumExpansion).map((area) => ({
  key: area.key,
  icon: area.icon as typeof Users,
  label: area.label,
  href: area.route.app,
  lastMessage: "Sem registros",
  time: "-",
  count: 0,
  color: area.color,
  bgColor: area.bg,
}))

export default function ConversasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { summary } = useOperationsDashboard()
  const { openFilters } = useAppInteractions()

  const conversations = useMemo(
    () =>
      baseConversations.map((conversation) => {
        if (conversation.key === "clientes") {
          const count = summary?.clientsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 cliente" : count > 1 ? `${count} clientes` : "Sem registros" }
        }

        if (conversation.key === "viagens") {
          const count = summary?.operationsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 viagem" : count > 1 ? `${count} viagens` : "Sem registros" }
        }

        if (conversation.key === "financeiro") {
          const count = summary?.financial.entriesCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 lancamento" : count > 1 ? `${count} lancamentos` : "Sem registros" }
        }

        if (conversation.key === "documentos") {
          const count = summary?.documentsCount ?? 0
          return { ...conversation, count, lastMessage: count === 1 ? "1 documento" : count > 1 ? `${count} documentos` : "Sem registros" }
        }

        if (conversation.key === "agenda") {
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
        <h1 className="mb-0.5 text-2xl font-bold text-[#0a0a0a]">Conversas</h1>
        <p className="text-sm text-gray-500">Todas as areas da sua operacao em um so lugar.</p>
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-300 focus:outline-none"
          />
        </div>
        <button onClick={openFilters} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtrar</span>
        </button>
      </motion.div>

      <div className="space-y-1">
        {filtered.map((conversation, index) => (
          <motion.div
            key={conversation.key}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.05 + index * 0.03 }}
          >
            <Link
              href={conversation.href}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: conversation.bgColor }}>
                <conversation.icon className="h-5 w-5" style={{ color: conversation.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0a0a0a]">{conversation.label}</span>
                  <span className="text-xs text-gray-400">{conversation.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-xs text-gray-500">{conversation.lastMessage}</span>
                  {conversation.count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0a0a] px-1.5 text-[11px] text-white">
                      {conversation.count}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 space-y-1 lg:hidden">
        <div className="px-1 pb-1 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Expansoes</span>
        </div>
        {expansionItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + index * 0.03 }}
          >
            <ExpansionLaunchItem
              item={item}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: item.bg }}>
                {item.imageSrc ? (
                  <div className="relative h-6 w-6 overflow-hidden rounded-lg">
                    <Image src={item.imageSrc} alt={item.label} fill className="object-contain" sizes="24px" />
                  </div>
                ) : item.icon === "headphones" ? (
                  <Headphones className="h-5 w-5" style={{ color: item.color }} />
                ) : (
                  <Shield className="h-5 w-5" style={{ color: item.color }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#0a0a0a]">{item.label}</span>
                <span className="block text-xs text-gray-500">{item.description}</span>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
            </ExpansionLaunchItem>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
