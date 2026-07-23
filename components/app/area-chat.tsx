"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, Send, Mic, Plus, Sparkles, type LucideIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export type ChatMessage = {
  id?: string
  from: "cos" | "user"
  text: string
  time: string
  ctaLabel?: string
  ctaHref?: string
}

export type QuickAction = {
  label: string
  icon?: LucideIcon
  onClick?: () => void
}

export type SendMessageResult =
  | void
  | {
      messages?: ChatMessage[]
    }
  | Promise<
      void | {
        messages?: ChatMessage[]
      }
    >

export function AreaChat({
  title,
  subtitle,
  icon: Icon,
  color = "#0a0a0a",
  bg = "#f3f4f6",
  conversationKey = "default",
  messages = [],
  quickActions = [],
  emptyLabel = "Nenhuma mensagem por aqui ainda.",
  placeholder = "Escreva uma mensagem...",
  onSendMessage,
  onAfterSendMessage,
  isLoadingHistory = false,
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  color?: string
  bg?: string
  conversationKey?: string
  messages?: ChatMessage[]
  quickActions?: QuickAction[]
  emptyLabel?: string
  placeholder?: string
  onSendMessage?: (input: string, now: string) => SendMessageResult
  onAfterSendMessage?: (result: Awaited<SendMessageResult>) => void | Promise<void>
  isLoadingHistory?: boolean
}) {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [chat, setChat] = useState<ChatMessage[]>(messages)
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const conversationKeyRef = useRef(conversationKey)
  const latestMessagesSignature = useMemo(
    () => messages.map((message) => message.id ?? `${message.from}:${message.time}:${message.text}`).join("|"),
    [messages],
  )

  useEffect(() => {
    if (conversationKeyRef.current !== conversationKey) {
      conversationKeyRef.current = conversationKey
      setChat(messages)
      return
    }

    setChat((current) => {
      const currentSignature = current.map((message) => message.id ?? `${message.from}:${message.time}:${message.text}`).join("|")
      return currentSignature === latestMessagesSignature ? current : messages
    })
  }, [conversationKey, latestMessagesSignature, messages])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [chat, isSending, isLoadingHistory])

  const send = async () => {
    if (!input.trim() || isSending) return
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const nextInput = input.trim()
    setChat((prev) => [...prev, { id: `local-user-${Date.now()}`, from: "user", text: nextInput, time: now }])
    setInput("")

    if (!onSendMessage) {
      return
    }

    setIsSending(true)

    try {
      const extra = await onSendMessage(nextInput, now)
      const extraMessages = extra?.messages ?? []

      if (extraMessages.length > 0) {
        setChat((prev) => [...prev, ...extraMessages])
      }

      await onAfterSendMessage?.(extra)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden lg:h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-lg">
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </span>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-[#0a0a0a] truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
      </div>

      {/* History */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3 pb-4">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center text-center h-full py-16">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon className="w-6 h-6" style={{ color }} />
            </span>
            <p className="text-sm text-gray-500 max-w-xs">Carregando mensagens...</p>
          </div>
        ) : chat.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full py-16">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon className="w-6 h-6" style={{ color }} />
            </span>
            <p className="text-sm text-gray-500 max-w-xs">{emptyLabel}</p>
          </div>
        ) : (
          chat.map((m, i) => (
            <motion.div
              key={m.id ?? `${m.from}:${m.time}:${m.text}:${i}`}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.from === "user" ? "bg-[#0a0a0a] text-white" : "bg-white border border-gray-100 text-[#0a0a0a]"}`}>
                {m.from === "cos" && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 mb-0.5">
                    <Sparkles className="w-3 h-3" /> COS
                  </span>
                )}
                <p className="text-sm leading-snug">{m.text}</p>
                {m.ctaLabel && m.ctaHref && (
                  <Link
                    href={m.ctaHref}
                    className="mt-2 inline-flex rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    {m.ctaLabel}
                  </Link>
                )}
                <span className={`block text-[10px] mt-1 ${m.from === "user" ? "text-gray-300" : "text-gray-400"}`}>{m.time}</span>
              </div>
            </motion.div>
          ))
        )}
        {isSending && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl border border-gray-100 bg-white px-3.5 py-2.5 text-[#0a0a0a]">
              <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                <Sparkles className="w-3 h-3" /> COS
              </span>
              <p className="text-sm leading-snug text-gray-500">Executando sua solicitação...</p>
            </div>
          </motion.div>
        )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                if (a.onClick) {
                  a.onClick()
                  return
                }
                setInput(a.label)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs font-medium text-gray-700 whitespace-nowrap hover:bg-gray-50 transition-colors"
            >
              {a.icon && <a.icon className="w-3.5 h-3.5" />}
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Message input */}
      <div
        className="flex-shrink-0 border-t border-gray-100 bg-white px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              inputRef.current?.focus()
              toast({
                title: "Ações rápidas",
                description: "Use os atalhos acima ou escreva sua solicitação para o COS.",
              })
            }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Adicionar"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 bg-gray-50 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
            />
          </div>
          {input.trim() ? (
            <button onClick={() => void send()} disabled={isSending} className="p-2.5 bg-[#0a0a0a] text-white rounded-full hover:bg-[#1a1a1a] transition-colors disabled:cursor-not-allowed disabled:opacity-50" aria-label="Enviar">
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                inputRef.current?.focus()
                toast({
                  title: "Ditado por voz",
                  description: "Use a tela inicial do COS para preencher mensagens por voz.",
                })
              }}
              className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Falar"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
