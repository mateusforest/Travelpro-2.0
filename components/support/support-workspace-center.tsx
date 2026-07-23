"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  ChevronLeft,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
} from "lucide-react"
import {
  addSupportMessageAction,
  getSupportTicketMessagesAction,
  getSupportTicketsAction,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/actions/support"
import { useSupport, type SupportCategory } from "@/components/support/support-context"
import { useAuth } from "@/components/auth/auth-provider"
import { publishOperationSync } from "@/lib/operation-sync"

type WorkspaceTicket = {
  id: string
  workspaceId: string
  userId: string
  category: string
  subject: string
  description: string
  priority: SupportTicketPriority
  status: SupportTicketStatus
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  workspaceName: string
  userName: string
  userEmail: string
  assigneeName: string
}

type WorkspaceMessage = {
  id: string
  ticketId: string
  senderId: string
  message: string
  createdAt: string
  senderName: string
  senderEmail: string
}

const supportCategories: SupportCategory[] = [
  "Dúvida sobre o COS",
  "Problema técnico",
  "Plano ou cobrança",
  "Integrações",
  "Falar com atendimento",
]

function formatSupportStatus(status: SupportTicketStatus) {
  switch (status) {
    case "open":
      return "Aberto"
    case "in_progress":
      return "Em andamento"
    case "waiting":
      return "Aguardando"
    case "resolved":
      return "Resolvido"
    case "closed":
      return "Fechado"
    default:
      return status
  }
}

function formatSupportPriority(priority: SupportTicketPriority) {
  switch (priority) {
    case "low":
      return "Baixa"
    case "medium":
      return "Média"
    case "high":
      return "Alta"
    case "urgent":
      return "Urgente"
    default:
      return priority
  }
}

function badgeTone(value: SupportTicketStatus | SupportTicketPriority) {
  if (value === "urgent" || value === "high" || value === "closed") {
    return "bg-red-50 text-red-700 border-red-100"
  }

  if (value === "resolved" || value === "low") {
    return "bg-green-50 text-green-700 border-green-100"
  }

  if (value === "in_progress" || value === "medium" || value === "waiting") {
    return "bg-amber-50 text-amber-700 border-amber-100"
  }

  return "bg-gray-50 text-gray-700 border-gray-100"
}

function formatDateLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function SupportWorkspaceCenter({
  backHref,
  compact = false,
}: {
  backHref?: string
  compact?: boolean
}) {
  const { user } = useAuth()
  const { openSupport, refreshKey } = useSupport()
  const [tickets, setTickets] = useState<WorkspaceTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [reply, setReply] = useState("")
  const [isLoadingTickets, setIsLoadingTickets] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  )

  const loadTickets = async (preferredTicketId?: string | null) => {
    setIsLoadingTickets(true)
    setError(null)

    const result = await getSupportTicketsAction()

    if (result.error) {
      setError(result.error)
      setTickets([])
      setSelectedTicketId(null)
      setIsLoadingTickets(false)
      return
    }

    const nextTickets = result.tickets as WorkspaceTicket[]
    setTickets(nextTickets)

    const nextSelectedId =
      preferredTicketId && nextTickets.some((ticket) => ticket.id === preferredTicketId)
        ? preferredTicketId
        : nextTickets[0]?.id ?? null

    setSelectedTicketId(nextSelectedId)
    setIsLoadingTickets(false)
  }

  const loadMessages = async (ticketId: string) => {
    setIsLoadingMessages(true)
    setError(null)

    const result = await getSupportTicketMessagesAction({ ticketId })

    if (result.error) {
      setError(result.error)
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    setMessages((result.messages ?? []) as WorkspaceMessage[])
    setIsLoadingMessages(false)
  }

  useEffect(() => {
    void loadTickets(selectedTicketId)
  }, [refreshKey])

  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([])
      return
    }

    void loadMessages(selectedTicketId)
  }, [selectedTicketId])

  useEffect(() => {
    void loadTickets(null)
  }, [])

  const handleReply = async () => {
    if (!selectedTicketId) {
      return
    }

    setIsSending(true)
    setError(null)
    setFeedback(null)

    const result = await addSupportMessageAction({
      ticketId: selectedTicketId,
      message: reply,
    })

    if (result.error) {
      setError(result.error)
      setIsSending(false)
      return
    }

    setReply("")
    setFeedback("Mensagem enviada com sucesso.")
    publishOperationSync({ source: "support" })
    await Promise.all([loadTickets(selectedTicketId), loadMessages(selectedTicketId)])
    setIsSending(false)
  }

  return (
    <div className={`mx-auto w-full ${compact ? "max-w-2xl px-4 py-4" : "max-w-6xl px-4 py-4 lg:py-6"}`}>
      {backHref && (
        <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
      )}

      <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
            <LifeBuoy className="h-6 w-6 text-gray-600" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#0a0a0a]">Suporte</h1>
            <p className="text-sm text-gray-500">
              Atendimento, dúvidas, problemas técnicos, plano, cobrança e integrações.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {supportCategories.map((category) => (
            <button
              key={category}
              onClick={() => openSupport(category)}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {category}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {feedback && (
        <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          {feedback}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px,minmax(0,1fr)]">
        <section className="rounded-3xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[#0a0a0a]">Chamados</h2>
              <p className="text-xs text-gray-500">Seu workspace visualiza apenas conversas reais.</p>
            </div>
            <button
              onClick={() => openSupport()}
              className="rounded-full bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a1a1a] transition-colors"
            >
              Iniciar suporte
            </button>
          </div>

          {isLoadingTickets ? (
            <div className="flex items-center justify-center px-4 py-10 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando chamados...
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-[#0a0a0a]">Nenhuma conversa de suporte ainda.</p>
              <p className="mt-1 text-sm text-gray-500">Abra seu primeiro chamado para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id)
                    setFeedback(null)
                  }}
                  className={`w-full px-4 py-4 text-left transition-colors hover:bg-gray-50 ${
                    ticket.id === selectedTicketId ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#0a0a0a]">{ticket.subject}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{ticket.category}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${badgeTone(ticket.status)}`}>
                      {formatSupportStatus(ticket.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
                    <span>{formatSupportPriority(ticket.priority)}</span>
                    <span>{formatDateLabel(ticket.updatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white">
          {!selectedTicket ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
                <ShieldAlert className="h-6 w-6 text-gray-400" />
              </div>
              <h2 className="text-base font-semibold text-[#0a0a0a]">Selecione um chamado</h2>
              <p className="mt-2 max-w-sm text-sm text-gray-500">
                As mensagens do suporte aparecerão aqui assim que um chamado for aberto.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col">
              <div className="border-b border-gray-100 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[#0a0a0a]">{selectedTicket.subject}</h2>
                    <p className="mt-1 text-sm text-gray-500">{selectedTicket.category}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeTone(selectedTicket.priority)}`}>
                      {formatSupportPriority(selectedTicket.priority)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeTone(selectedTicket.status)}`}>
                      {formatSupportStatus(selectedTicket.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 px-4 py-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando mensagens...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    Nenhuma mensagem neste chamado ainda.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                            isCurrentUser ? "bg-[#0a0a0a] text-white" : "bg-gray-50 text-[#0a0a0a]"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-[11px] opacity-75">
                            <span>{message.senderName}</span>
                            <span>{formatDateLabel(message.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{message.message}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="border-t border-gray-100 px-4 py-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-2">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      rows={2}
                      placeholder="Responder ao suporte..."
                      className="min-h-[72px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#0a0a0a] focus:outline-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={isSending || !reply.trim()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0a0a] text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Enviar resposta"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
