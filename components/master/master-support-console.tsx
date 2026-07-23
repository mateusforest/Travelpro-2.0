"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Loader2, Send, LifeBuoy } from "lucide-react"
import {
  addSupportMessageAction,
  assignSupportTicketAction,
  getSupportTicketMessagesAction,
  getSupportTicketsAction,
  updateSupportTicketPriorityAction,
  updateSupportTicketStatusAction,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/actions/support"
import { EmptyState, PrimaryButton, SecondaryButton, StatusBadge, TableCard } from "@/components/master/master-ui"
import { useAuth } from "@/components/auth/auth-provider"
import { publishOperationSync } from "@/lib/operation-sync"

type MasterTicket = {
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

type MasterMessage = {
  id: string
  ticketId: string
  senderId: string
  message: string
  createdAt: string
  senderName: string
  senderEmail: string
}

const statusOptions: { label: string; value: SupportTicketStatus | "all" | "urgent" }[] = [
  { label: "Todos", value: "all" },
  { label: "Abertos", value: "open" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Resolvidos", value: "resolved" },
  { label: "Fechados", value: "closed" },
  { label: "Urgentes", value: "urgent" as SupportTicketStatus },
]

const statusSelectOptions: { label: string; value: SupportTicketStatus }[] = [
  { label: "Aberto", value: "open" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Aguardando", value: "waiting" },
  { label: "Resolvido", value: "resolved" },
  { label: "Fechado", value: "closed" },
]

const prioritySelectOptions: { label: string; value: SupportTicketPriority }[] = [
  { label: "Baixa", value: "low" },
  { label: "Média", value: "medium" },
  { label: "Alta", value: "high" },
  { label: "Urgente", value: "urgent" },
]

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

function statusLabel(value: SupportTicketStatus) {
  if (value === "open") return "Aberto"
  if (value === "in_progress") return "Em andamento"
  if (value === "waiting") return "Aguardando"
  if (value === "resolved") return "Resolvido"
  if (value === "closed") return "Fechado"
  return value
}

function priorityLabel(value: SupportTicketPriority) {
  if (value === "low") return "Baixa"
  if (value === "medium") return "Média"
  if (value === "high") return "Alta"
  if (value === "urgent") return "Urgente"
  return value
}

export function MasterSupportConsole() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<MasterTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MasterMessage[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<(typeof statusOptions)[number]["value"]>("all")
  const [reply, setReply] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isLoadingTickets, setIsLoadingTickets] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false)

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "urgent"
            ? ticket.priority === "urgent"
            : ticket.status === filter

      if (!matchesFilter) {
        return false
      }

      const haystack = [
        ticket.subject,
        ticket.category,
        ticket.workspaceName,
        ticket.userName,
        ticket.userEmail,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(search.trim().toLowerCase())
    })
  }, [tickets, filter, search])

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  )

  const openCount = tickets.filter((ticket) => ticket.status === "open").length
  const inProgressCount = tickets.filter((ticket) => ticket.status === "in_progress").length
  const resolvedCount = tickets.filter((ticket) => ticket.status === "resolved").length
  const urgentCount = tickets.filter((ticket) => ticket.priority === "urgent").length

  const loadTickets = async (preferredTicketId?: string | null) => {
    setIsLoadingTickets(true)
    setError(null)

    const result = await getSupportTicketsAction({ scope: "all" })

    if (result.error) {
      setError(result.error)
      setTickets([])
      setSelectedTicketId(null)
      setIsLoadingTickets(false)
      return
    }

    const nextTickets = (result.tickets ?? []) as MasterTicket[]
    setTickets(nextTickets)

    const nextSelected =
      preferredTicketId && nextTickets.some((ticket) => ticket.id === preferredTicketId)
        ? preferredTicketId
        : nextTickets[0]?.id ?? null

    setSelectedTicketId(nextSelected)
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

    setMessages((result.messages ?? []) as MasterMessage[])
    setIsLoadingMessages(false)
  }

  useEffect(() => {
    void loadTickets(null)
  }, [])

  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([])
      return
    }

    void loadMessages(selectedTicketId)
  }, [selectedTicketId])

  const handleReply = async () => {
    if (!selectedTicketId) return

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
    setFeedback("Resposta enviada com sucesso.")
    publishOperationSync({ source: "master" })
    await Promise.all([loadTickets(selectedTicketId), loadMessages(selectedTicketId)])
    setIsSending(false)
  }

  const updateStatus = async (value: SupportTicketStatus) => {
    if (!selectedTicketId) return

    setIsUpdatingMeta(true)
    setError(null)
    setFeedback(null)

    const result = await updateSupportTicketStatusAction({
      ticketId: selectedTicketId,
      status: value,
    })

    if (result.error) {
      setError(result.error)
      setIsUpdatingMeta(false)
      return
    }

    setFeedback("Status atualizado com sucesso.")
    publishOperationSync({ source: "master" })
    await loadTickets(selectedTicketId)
    setIsUpdatingMeta(false)
  }

  const updatePriority = async (value: SupportTicketPriority) => {
    if (!selectedTicketId) return

    setIsUpdatingMeta(true)
    setError(null)
    setFeedback(null)

    const result = await updateSupportTicketPriorityAction({
      ticketId: selectedTicketId,
      priority: value,
    })

    if (result.error) {
      setError(result.error)
      setIsUpdatingMeta(false)
      return
    }

    setFeedback("Prioridade atualizada com sucesso.")
    publishOperationSync({ source: "master" })
    await loadTickets(selectedTicketId)
    setIsUpdatingMeta(false)
  }

  const assignToMe = async () => {
    if (!selectedTicketId || !user?.id) return

    setIsUpdatingMeta(true)
    setError(null)
    setFeedback(null)

    const result = await assignSupportTicketAction({
      ticketId: selectedTicketId,
      assigneeId: user.id,
    })

    if (result.error) {
      setError(result.error)
      setIsUpdatingMeta(false)
      return
    }

    setFeedback("Chamado atribuído com sucesso.")
    publishOperationSync({ source: "master" })
    await loadTickets(selectedTicketId)
    setIsUpdatingMeta(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Chamados abertos" value={String(openCount)} detail="Aguardando primeira resposta" />
        <MetricCard label="Em andamento" value={String(inProgressCount)} detail="Atendidos pela equipe COS" />
        <MetricCard label="Resolvidos" value={String(resolvedCount)} detail="Encerrados com retorno" />
        <MetricCard label="Urgentes" value={String(urgentCount)} detail="Prioridade máxima" />
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{feedback}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),380px]">
        <TableCard
          toolbar={
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 flex-wrap">
                {statusOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setFilter(option.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filter === option.value ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar assunto, categoria, workspace ou usuário..."
                  className="w-full rounded-xl bg-gray-50 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>
          }
        >
          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Carregando chamados...
            </div>
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="Nenhum chamado encontrado"
              description="Nenhum ticket combina com os filtros atuais."
            />
          ) : (
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Chamado</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">Workspace</th>
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Prioridade</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicketId(ticket.id)
                      setFeedback(null)
                    }}
                    className={`border-b border-gray-50 last:border-0 transition-colors cursor-pointer ${
                      selectedTicketId === ticket.id ? "bg-gray-50/80" : "hover:bg-gray-50/60"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{ticket.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{ticket.category}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{ticket.workspaceName}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      <p>{ticket.userName}</p>
                      <p className="text-xs text-muted-foreground">{ticket.userEmail || "Sem e-mail"}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={priorityLabel(ticket.priority)} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={statusLabel(ticket.status)} /></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDateLabel(ticket.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>

        <div className="rounded-3xl border border-gray-100 bg-white min-h-[560px]">
          {!selectedTicket ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <p className="text-base font-semibold text-foreground">Selecione um chamado</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  O histórico completo e os controles do ticket aparecerão aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-100 p-5 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chamado</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{selectedTicket.subject}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedTicket.category}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(event) => void updateStatus(event.target.value as SupportTicketStatus)}
                      disabled={isUpdatingMeta}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      {statusSelectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Prioridade</span>
                    <select
                      value={selectedTicket.priority}
                      onChange={(event) => void updatePriority(event.target.value as SupportTicketPriority)}
                      disabled={isUpdatingMeta}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      {prioritySelectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium text-foreground">Workspace:</span> {selectedTicket.workspaceName}</p>
                  <p><span className="font-medium text-foreground">Usuário:</span> {selectedTicket.userName}</p>
                  <p><span className="font-medium text-foreground">Responsável:</span> {selectedTicket.assigneeName || "Não atribuído"}</p>
                </div>

                <div className="flex items-center gap-2">
                  <PrimaryButton icon={Send} onClick={() => void assignToMe()}>
                    Assumir chamado
                  </PrimaryButton>
                  <SecondaryButton onClick={() => void loadTickets(selectedTicket.id)}>
                    Atualizar
                  </SecondaryButton>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Carregando mensagens...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground">
                    Nenhuma mensagem registrada ainda neste chamado.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.id
                    return (
                      <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${isCurrentUser ? "bg-[#0a0a0a] text-white" : "bg-gray-50 text-foreground"}`}>
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

              <div className="border-t border-gray-100 p-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-2">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      rows={2}
                      placeholder="Responder ao chamado..."
                      className="min-h-[72px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={isSending || !reply.trim()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0a0a] text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Enviar resposta"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
