"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Headphones, Shield, Sparkles, X, type LucideIcon } from "lucide-react"
import type { ExpansionItem } from "@/lib/expansion-configs"

type ExpansionModalContent = {
  title: string
  subtitle: string
  badge: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  features: string[]
}

const expansionModalContentBySlug: Record<string, ExpansionModalContent> = {
  advisor: {
    title: "Advisor",
    subtitle: "Seu consultor inteligente para aumentar vendas e melhorar o atendimento.",
    badge: "Em desenvolvimento",
    icon: Headphones,
    iconBg: "rgba(79, 70, 229, 0.14)",
    iconColor: "#4f46e5",
    features: [
      "Análise de vendas",
      "Sugestões de negociação",
      "Recomendações comerciais",
      "Análise da carteira de clientes",
      "Insights sobre produtividade",
      "Apoio em situações de viagem",
      "Recomendações personalizadas",
    ],
  },
  agent: {
    title: "Agent",
    subtitle: "Seu agente virtual para atendimento e qualificação de clientes.",
    badge: "Em desenvolvimento",
    icon: Shield,
    iconBg: "rgba(37, 99, 235, 0.12)",
    iconColor: "#2563eb",
    features: [
      "Pré-atendimento",
      "Qualificação de leads",
      "Atendimento automático",
      "Geração de briefing",
      "Criação automática de clientes",
      "Integração futura com canais de atendimento",
      "Transferência para consultor humano",
    ],
  },
}

export function ExpansionShowcaseModal({
  item,
  open,
  onClose,
}: {
  item: ExpansionItem
  open: boolean
  onClose: () => void
}) {
  const content = expansionModalContentBySlug[item.slug]

  if (!content) {
    return null
  }

  const Icon = content.icon

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-[#0a0a0a]/55 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[90] overflow-hidden rounded-t-[2rem] bg-[#fcfcfb] shadow-2xl lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85vh] lg:max-w-2xl lg:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden">
              <div
                className="absolute inset-x-0 top-0 h-40 opacity-90"
                style={{
                  background: `radial-gradient(circle at top left, ${item.bg} 0%, rgba(255,255,255,0) 58%), linear-gradient(135deg, rgba(10,10,10,0.96) 0%, rgba(23,23,23,0.9) 55%, rgba(10,10,10,0.95) 100%)`,
                }}
              />

              <div className="relative px-5 pb-8 pt-5 lg:px-8 lg:pb-9 lg:pt-7">
                <div className="mb-8 flex items-start justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    {content.badge}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="rounded-full border border-white/10 bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-6 flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 shadow-lg"
                    style={{ backgroundColor: content.iconBg }}
                  >
                    <Icon className="h-8 w-8" style={{ color: content.iconColor }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold tracking-tight text-white lg:text-[2rem]">{content.title}</h2>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/72 lg:text-[15px]">{content.subtitle}</p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-[#ece9e4] bg-white/96 p-4 shadow-[0_20px_60px_rgba(10,10,10,0.08)] backdrop-blur-sm lg:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b645c]">Recursos</h3>
                    <span className="text-xs text-gray-400">Somente apresentação</span>
                  </div>

                  <div className="grid gap-2.5 lg:grid-cols-2">
                    {content.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 rounded-2xl border border-[#f0ede8] bg-[#fbfaf8] px-4 py-3 text-sm text-[#1f1f1f]"
                      >
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
