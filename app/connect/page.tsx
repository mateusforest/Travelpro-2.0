"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Mic, Send, Database, FileSpreadsheet, Mail, MessageCircle, Plug, LifeBuoy, Wrench, Layers } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useConnect } from "@/components/connect/connect-store"
import { useSupport } from "@/components/support/support-context"

const COS_LOGO = "/travelpro-logo-mark.png"

const sourceTypeIcon: Record<string, typeof Database> = {
  ERP: Database,
  CRM: Plug,
  Planilha: FileSpreadsheet,
  "E-mail": Mail,
  WhatsApp: MessageCircle,
  "Banco de dados": Database,
  API: Plug,
  "Portal interno": Database,
}

export default function ConnectHomePage() {
  const { user, profile } = useAuth()
  const { sources, summary, hasSources, openModal, toast, isLoading } = useConnect()
  const { openSupport } = useSupport()
  const [message, setMessage] = useState("")

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "sua equipe"

  const onboardingCtas = [
    { icon: Database, label: "Conectar sistema", modal: "system" as const },
    { icon: FileSpreadsheet, label: "Importar planilha", modal: "spreadsheet" as const },
    { icon: Mail, label: "Conectar e-mail", modal: "email" as const },
    { icon: MessageCircle, label: "Conectar WhatsApp", modal: "whatsapp" as const },
    { icon: LifeBuoy, label: "Suporte", action: () => openSupport() },
  ]

  const handleSend = () => {
    if (!message.trim()) return
    toast("Esta conversa ainda nao executa integracoes externas. Use as fontes, sessoes e acoes para preparar o Connect.")
    setMessage("")
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col lg:h-full lg:min-h-full">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl">
            <Image src={COS_LOGO} alt="TravelPro" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.3 }} className="mb-5 text-center">
          <h1 className="mb-1 text-2xl font-semibold text-[#0a0a0a]">{`Ola, ${displayName}`}</h1>
          <p className="text-sm text-gray-500">Conecte fontes, organize sessoes e prepare a operacao do Connect.</p>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }} className="mb-4 w-full max-w-sm">
          <div className="relative rounded-full border border-gray-200 bg-white shadow-sm">
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSend()}
              placeholder="Converse com seus sistemas..."
              className="w-full rounded-full bg-transparent px-5 py-3 pr-20 text-sm focus:outline-none"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              <button
                onClick={() => toast("O ditado por voz sera habilitado quando a integracao desta fonte estiver ativa.")}
                className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Falar"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={handleSend}
                className="tp-gradient-chip rounded-full p-2 transition-colors"
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-gray-500">
            O Connect ja salva fontes, sessoes e acoes. A execucao em sistemas terceiros ainda nao acontece por este campo.
          </p>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }} className="flex max-w-md flex-wrap justify-center gap-2">
          {hasSources
            ? [
                { icon: Plug, label: `${summary.totalSources} fontes`, action: () => openModal("system") },
                { icon: Layers, label: `${summary.totalSections} sessoes`, action: () => openModal("section", { sourceId: sources[0]?.id }) },
                { icon: Wrench, label: `${summary.totalActions} acoes`, action: () => openModal("action", { sourceId: sources[0]?.id }) },
                { icon: LifeBuoy, label: "Suporte", action: () => openSupport() },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))
            : onboardingCtas.map((cta) => (
                <button
                  key={cta.label}
                  onClick={() => {
                    if ("modal" in cta && cta.modal) {
                      openModal(cta.modal)
                      return
                    }

                    cta.action?.()
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <cta.icon className="h-3.5 w-3.5" />
                  {cta.label}
                </button>
              ))}
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }} className="px-4 pb-2">
        <div className="mb-2 flex items-center gap-1.5">
          <Plug className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Suas fontes</span>
        </div>

        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        ) : hasSources ? (
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.map((source) => {
                const Icon = sourceTypeIcon[source.sourceType] ?? Plug
                return (
                  <div key={source.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#0a0a0a]">{source.name}</span>
                        <span className="block text-[11px] text-gray-400">
                          {source.sourceType} · {source.statusLabel}
                        </span>
                      </span>
                    </div>
                     <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                       <span>{source.sectionsCount} sessoes</span>
                       <span>{source.actionsCount} acoes</span>
                     </div>
                     <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openModal("section", { sourceId: source.id })}
                        className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Criar sessao
                      </button>
                      <button
                        onClick={() => openModal("action", { sourceId: source.id })}
                        className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                       >
                         Criar acao
                       </button>
                     </div>
                     <div className="mt-2 flex justify-end">
                       <button
                         onClick={() => openModal("deleteSource", { sourceId: source.id })}
                         className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
                       >
                         Remover fonte
                       </button>
                     </div>
                   </div>
                 )
               })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Plug className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-[#0a0a0a]">O COS Connect ainda nao possui fontes conectadas.</h3>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">
              Crie sua primeira fonte para organizar sessoes, acoes e conversas operacionais do Connect.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => openModal("system")}
                className="tp-gradient-btn flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                <Plug className="h-4 w-4" /> Conectar primeira fonte
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal("spreadsheet")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Importar planilha
                </button>
                <button
                  onClick={() => openSupport()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <LifeBuoy className="h-4 w-4" /> Suporte
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
