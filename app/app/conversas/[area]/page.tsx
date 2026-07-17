"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Clapperboard, Image as ImageIcon, Megaphone, MessageSquare, Sparkles } from "lucide-react"
import {
  getOperationsConversationMessagesAction,
  runOperationsEngineAction,
} from "@/actions/operations-engine"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { areaConfigs, resolveAreaConversationInput, resolveAreaHistoryInputs, slug } from "@/lib/area-configs"

const STUDIO_SECTION_CARDS = {
  Criativos: {
    icon: Sparkles,
    description: "Organize conceitos, pecas e direcionamentos criativos da agencia.",
  },
  Imagens: {
    icon: ImageIcon,
    description: "Centralize referencias visuais, necessidades e prioridades de imagens.",
  },
  Videos: {
    icon: Clapperboard,
    description: "Estruture roteiros, ideias e frentes de videos no Studio IA.",
  },
  Campanhas: {
    icon: Megaphone,
    description: "Conecte criacao e planejamento de campanhas em uma conversa contextual.",
  },
} as const

export default function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const config = areaConfigs[area]
  const conversationInput = resolveAreaConversationInput(area)
  const historyInputs = resolveAreaHistoryInputs(area)
  const isChatArea = Boolean(config) && config.subsections.length === 0
  const initialPrompt = searchParams.get("prompt") ?? undefined
  const autoSendInitialPrompt = searchParams.get("autoSend") === "1"
  const { refreshSummary } = useOperationsDashboard()
  const [messages, setMessages] = useState<ChatMessage[]>(config?.messages ?? [])
  const [isLoadingMessages, setIsLoadingMessages] = useState(isChatArea)

  useEffect(() => {
    if (!config || !isChatArea) {
      return
    }

    let isMounted = true

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      const results = await Promise.all(historyInputs.map((input) => getOperationsConversationMessagesAction(input)))

      if (!isMounted) {
        return
      }

      const loadedMessages = results.flatMap((result) => (result.success ? result.messages : []))

      if (loadedMessages.length > 0) {
        const uniqueMessages = Array.from(
          new Map(loadedMessages.map((message) => [message.id ?? `${message.from}:${message.time}:${message.text}`, message])).values(),
        )
        setMessages(uniqueMessages)
      } else {
        setMessages(config.messages ?? [])
      }

      setIsLoadingMessages(false)
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [area, config, isChatArea])

  if (!config) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-[#0a0a0a] mb-1">Conversa nao encontrada</h1>
          <p className="text-sm text-gray-500">Esta conversa ainda nao esta disponivel para o seu workspace.</p>
        </div>
      </div>
    )
  }

  const Icon = config.icon

  if (config.subsections.length === 0) {
    return (
      <AreaChat
        conversationKey={area}
        title={config.label}
        subtitle={config.subtitle ?? `Conversa contextual de ${config.label.toLowerCase()} do seu workspace.`}
        icon={Icon}
        color={config.color}
        bg={config.bg}
        messages={messages}
        isLoadingHistory={isLoadingMessages}
        quickActions={config.quickActions.map((label) => ({ label }))}
        initialInput={initialPrompt}
        autoSendInitialInput={autoSendInitialPrompt}
        onSendMessage={async (input, now) => {
          try {
            const result = await runOperationsEngineAction({
              message: input,
              area: conversationInput.area,
              subArea: conversationInput.subArea,
            })
            const responseText =
              typeof result.message === "string" && result.message.trim()
                ? result.message
                : "Nao consegui executar sua solicitacao agora. Tente novamente em instantes."
            const ctaLabel =
              "suggestedLabel" in result && typeof result.suggestedLabel === "string" ? result.suggestedLabel : undefined
            const ctaHref =
              "suggestedHref" in result && typeof result.suggestedHref === "string" ? result.suggestedHref : undefined

            if (result.ok) {
              void refreshSummary({ silent: true, force: true })
            }

            return {
              messages: [
                {
                  id: `area-cos-${Date.now()}`,
                  from: "cos",
                  text: responseText,
                  time: now,
                  ctaLabel,
                  ctaHref,
                },
              ],
            }
          } catch {
            return {
              messages: [
                {
                  id: `area-cos-error-${Date.now()}`,
                  from: "cos",
                  text: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
                  time: now,
                },
              ],
            }
          }
        }}
        emptyLabel={config.emptyLabel ?? `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${config.label.toLowerCase()}.`}
      />
    )
  }

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-5">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
          <Icon className="w-6 h-6" style={{ color: config.color }} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#0a0a0a]">{config.label}</h1>
          <p className="text-sm text-gray-500">Selecione uma area para abrir a conversa contextual.</p>
        </div>
      </div>

      {area === "studio-ia" ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {config.subsections.map((sub) => {
            const cardMeta = STUDIO_SECTION_CARDS[sub as keyof typeof STUDIO_SECTION_CARDS]
            const CardIcon = cardMeta?.icon ?? Icon

            return (
              <Link
                key={sub}
                href={`/app/conversas/${area}/${slug(sub)}`}
                className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color }}>
                  Studio IA
                </div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: config.bg }}>
                  <CardIcon className="h-5 w-5" style={{ color: config.color }} />
                </div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{sub}</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {cardMeta?.description ?? "Abrir conversa contextual desta area no Studio IA."}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium" style={{ color: config.color }}>
                  Abrir conversa
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-6">
          {config.subsections.map((sub) => (
            <Link
              key={sub}
              href={`/app/conversas/${area}/${slug(sub)}`}
              className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
            >
              <span className="text-sm text-[#0a0a0a]">{sub}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
