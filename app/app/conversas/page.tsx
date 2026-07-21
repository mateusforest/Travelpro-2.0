"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Headphones,
  Shield,
} from "lucide-react"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { useAppInteractions } from "@/components/app/app-interactions"
import { ExpansionLaunchItem } from "@/components/expansions/expansion-launch-item"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { expansionItems } from "@/lib/expansion-configs"
import { moduleVisualSections } from "@/lib/module-visual-structure"

type ConversationMeta = {
  count: number
  lastMessage: string
  time: string
}

function resolveConversationMeta(key: string, summary: ReturnType<typeof useOperationsDashboard>["summary"]): ConversationMeta {
  if (key === "clientes") {
    const count = summary?.clientsCount ?? 0
    return { count, lastMessage: count === 1 ? "1 cliente" : count > 1 ? `${count} clientes` : "Sem registros", time: "-" }
  }

  if (key === "viagens") {
    const count = summary?.operationsCount ?? 0
    return { count, lastMessage: count === 1 ? "1 viagem" : count > 1 ? `${count} viagens` : "Sem registros", time: "-" }
  }

  if (key === "financeiro") {
    const count = summary?.financial.entriesCount ?? 0
    return { count, lastMessage: count === 1 ? "1 lancamento" : count > 1 ? `${count} lancamentos` : "Sem registros", time: "-" }
  }

  if (key === "documentos") {
    const count = summary?.documentsCount ?? 0
    return { count, lastMessage: count === 1 ? "1 documento" : count > 1 ? `${count} documentos` : "Sem registros", time: "-" }
  }

  if (key === "agenda") {
    const count = summary?.meetingsCount ?? 0
    return { count, lastMessage: count === 1 ? "1 atendimento" : count > 1 ? `${count} atendimentos` : "Sem registros", time: "-" }
  }

  return { count: 0, lastMessage: "Sem registros", time: "-" }
}

export default function ConversasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    comercial: false,
    documentos: false,
  })
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const { summary } = useOperationsDashboard()
  const { openFilters } = useAppInteractions()
  const pathname = usePathname()

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current }
      let changed = false

      moduleVisualSections.forEach((section) => {
        if (!section.children?.length) {
          return
        }

        const hasActiveChild = section.children.some((child) => child.appHref === pathname)

        if (hasActiveChild && !next[section.key]) {
          next[section.key] = true
          changed = true
        }
      })

      return changed ? next : current
    })
  }, [pathname])

  const sections = useMemo(
    () =>
      moduleVisualSections
        .map((section) => {
          const sectionMatches = section.label.toLowerCase().includes(normalizedSearch)

          if (!section.children?.length) {
            return {
              ...section,
              meta: resolveConversationMeta(section.key, summary),
            }
          }

          const children = section.children
            .map((child) => ({
              ...child,
              meta: resolveConversationMeta(child.key, summary),
            }))
            .filter((child) => {
              if (!normalizedSearch) {
                return true
              }

              return child.label.toLowerCase().includes(normalizedSearch) || child.meta.lastMessage.toLowerCase().includes(normalizedSearch)
            })

          if (!normalizedSearch || sectionMatches || children.length > 0) {
            return { ...section, children }
          }

          return null
        })
        .filter((section): section is NonNullable<typeof section> => Boolean(section))
        .filter((section) => {
          if (!normalizedSearch) {
            return true
          }

          if (section.children?.length) {
            return section.label.toLowerCase().includes(normalizedSearch) || section.children.length > 0
          }

          return (
            section.label.toLowerCase().includes(normalizedSearch) ||
            ("meta" in section && section.meta.lastMessage.toLowerCase().includes(normalizedSearch))
          )
        }),
    [normalizedSearch, summary],
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

      <div className="space-y-3">
        {sections.map((section, index) => {
          if (!section.children?.length && section.appHref && section.icon && "meta" in section) {
            const Icon = section.icon

            return (
              <motion.div
                key={section.key}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 + index * 0.03 }}
              >
                <Link
                  href={section.appHref}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: section.bg }}>
                    <Icon className="h-5 w-5" style={{ color: section.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#0a0a0a]">{section.label}</span>
                      <span className="text-xs text-gray-400">{section.meta.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 text-xs text-gray-500">{section.meta.lastMessage}</span>
                      {section.meta.count > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0a0a] px-1.5 text-[11px] text-white">
                          {section.meta.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
                </Link>
              </motion.div>
            )
          }

          const SectionIcon = section.icon

          return (
            <motion.div
              key={section.key}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
            >
              <Collapsible
                open={openGroups[section.key]}
                onOpenChange={(open) => setOpenGroups((current) => ({ ...current, [section.key]: open }))}
              >
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50">
                    {SectionIcon ? (
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: section.bg }}>
                        <SectionIcon className="h-5 w-5" style={{ color: section.color }} />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#0a0a0a]">{section.label}</span>
                      <span className="block text-xs text-gray-500">Agrupamento visual dos modulos desta frente.</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${openGroups[section.key] ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="overflow-hidden border-t border-gray-100">
                  <div className="divide-y divide-gray-100">
                    {section.children?.map((item) => {
                      const Icon = item.icon

                      if (!item.appHref || !("meta" in item)) {
                        return null
                      }

                      return (
                        <Link
                          key={item.key}
                          href={item.appHref}
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: item.bg }}>
                            <Icon className="h-4 w-4" style={{ color: item.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                              <span className="text-xs text-gray-400">{item.meta.time}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-xs text-gray-500">{item.meta.lastMessage}</span>
                              {item.meta.count > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a0a0a] px-1.5 text-[11px] text-white">
                                  {item.meta.count}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
                        </Link>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )
        })}
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
