"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, FileText, Loader2, Pencil, Plus, Search } from "lucide-react"
import { getClientsAction, type ClientStatus } from "@/actions/clients"
import { createQuoteAction, getQuotesAction, updateQuoteAction, type QuoteStatus } from "@/actions/quotes"
import { getTripsAction, type TripStatus } from "@/actions/trips"
import { useAuth } from "@/components/auth/auth-provider"

type QuoteRecord = {
  id: string
  clientId: string | null
  tripId: string | null
  title: string
  status: QuoteStatus
  currency: string
  totalAmount: number
  validUntil: string | null
  notes: string
  createdAt: string | null
}

type ClientOption = {
  id: string
  name: string
  status: ClientStatus
}

type TripOption = {
  id: string
  title: string
  status: TripStatus
}

type QuoteFormState = {
  clientId: string
  tripId: string
  title: string
  status: QuoteStatus
  currency: string
  totalAmount: string
  validUntil: string
  notes: string
}

const defaultForm: QuoteFormState = {
  clientId: "",
  tripId: "",
  title: "",
  status: "draft",
  currency: "BRL",
  totalAmount: "0,00",
  validUntil: "",
  notes: "",
}

function formatDateLabel(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatAmountLabel(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(value || 0)
}

function quoteStatusLabel(status: QuoteStatus) {
  if (status === "sent") return "Enviada"
  if (status === "approved") return "Aprovada"
  if (status === "rejected") return "Rejeitada"
  if (status === "expired") return "Expirada"
  if (status === "archived") return "Arquivada"
  return "Rascunho"
}

function quoteStatusTone(status: QuoteStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-600"
  if (status === "rejected" || status === "archived") return "bg-gray-100 text-gray-600"
  if (status === "sent") return "bg-blue-50 text-blue-600"
  if (status === "expired") return "bg-amber-50 text-amber-700"
  return "bg-violet-50 text-violet-600"
}

export function QuotesManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [trips, setTrips] = useState<TripOption[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | QuoteStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [form, setForm] = useState<QuoteFormState>(defaultForm)

  const clientsMap = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients])
  const tripsMap = useMemo(() => new Map(trips.map((trip) => [trip.id, trip.title])), [trips])

  const loadQuotes = async () => {
    setIsLoading(true)
    setError(null)

    const [quotesResult, clientsResult, tripsResult] = await Promise.all([
      getQuotesAction(),
      getClientsAction(),
      getTripsAction(),
    ])

    if (quotesResult.error) {
      setError(quotesResult.error)
      setQuotes([])
      setIsLoading(false)
      return
    }

    setQuotes((quotesResult.quotes ?? []) as QuoteRecord[])
    setClients(
      ((clientsResult.clients ?? []) as Array<{ id: string; name: string; status: ClientStatus }>)
        .filter((client) => client.status === "active"),
    )
    setTrips(
      ((tripsResult.trips ?? []) as Array<{ id: string; title: string; status: TripStatus }>)
        .filter((trip) => trip.status !== "archived"),
    )
    setIsLoading(false)
  }

  useEffect(() => {
    void loadQuotes()
  }, [])

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const matchesFilter = filter === "all" ? true : quote.status === filter
      const term = search.trim().toLowerCase()
      const clientName = quote.clientId ? clientsMap.get(quote.clientId) ?? "" : ""
      const tripName = quote.tripId ? tripsMap.get(quote.tripId) ?? "" : ""
      const matchesSearch = !term || [quote.title, quote.notes, clientName, tripName].join(" ").toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [clientsMap, filter, quotes, search, tripsMap])

  const startCreate = () => {
    setEditingQuoteId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (quote: QuoteRecord) => {
    setEditingQuoteId(quote.id)
    setForm({
      clientId: quote.clientId ?? "",
      tripId: quote.tripId ?? "",
      title: quote.title,
      status: quote.status,
      currency: quote.currency || "BRL",
      totalAmount: String(quote.totalAmount ?? 0).replace(".", ","),
      validUntil: quote.validUntil ? quote.validUntil.slice(0, 10) : "",
      notes: quote.notes,
    })
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const payload = {
      clientId: form.clientId || undefined,
      tripId: form.tripId || undefined,
      title: form.title,
      status: form.status,
      currency: form.currency,
      totalAmount: form.totalAmount,
      validUntil: form.validUntil,
      notes: form.notes,
    }

    const result = editingQuoteId
      ? await updateQuoteAction({ quoteId: editingQuoteId, ...payload })
      : await createQuoteAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingQuoteId ? "Cotacao atualizada com sucesso." : "Cotacao criada com sucesso.")
    setModalOpen(false)
    await loadQuotes()
  }

  return (
    <div className={variant === "portal" ? "flex-1 flex flex-col h-full" : ""}>
      <div className={variant === "portal" ? "max-w-7xl mx-auto w-full px-6 py-8" : "px-4 py-4 max-w-6xl mx-auto"}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0a0a0a]">{title}</h1>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={startCreate}
            disabled={!canManageWorkspace}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Nova cotacao
          </button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {feedback && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por titulo, cliente, viagem ou observacoes..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Rascunho", value: "draft" as const },
                { label: "Enviadas", value: "sent" as const },
                { label: "Aprovadas", value: "approved" as const },
                { label: "Rejeitadas", value: "rejected" as const },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    filter === option.value ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando cotacoes...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma cotacao cadastrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Titulo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Viagem</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Validade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{quote.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{quote.clientId ? clientsMap.get(quote.clientId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{quote.tripId ? tripsMap.get(quote.tripId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatAmountLabel(quote.totalAmount, quote.currency)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(quote.validUntil)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${quoteStatusTone(quote.status)}`}>
                          {quoteStatusLabel(quote.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(quote)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-2xl lg:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <FileText className="h-5 w-5 text-blue-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingQuoteId ? "Editar cotacao" : "Nova cotacao"}</h2>
                <p className="text-sm text-gray-500">Registre cotacoes reais da agencia e vincule aos registros necessarios.</p>
              </div>
            </div>

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Cliente">
                  <select
                    value={form.clientId}
                    onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="">Sem cliente vinculado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Viagem">
                  <select
                    value={form.tripId}
                    onChange={(event) => setForm((prev) => ({ ...prev, tripId: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="">Sem viagem vinculada</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Titulo">
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Titulo da cotacao"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as QuoteStatus }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviada</option>
                    <option value="approved">Aprovada</option>
                    <option value="rejected">Rejeitada</option>
                    <option value="expired">Expirada</option>
                    <option value="archived">Arquivada</option>
                  </select>
                </FormField>
                <FormField label="Moeda">
                  <input
                    value={form.currency}
                    onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                    maxLength={3}
                    placeholder="BRL"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm uppercase focus:border-gray-300 focus:outline-none"
                  />
                </FormField>
                <FormField label="Valor total">
                  <input
                    value={form.totalAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </FormField>
              </div>

              <FormField label="Valida ate">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(event) => setForm((prev) => ({ ...prev, validUntil: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </FormField>

              <FormField label="Observacoes">
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Observacoes da cotacao"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || !canManageWorkspace}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingQuoteId ? "Salvar alteracoes" : "Salvar cotacao"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}
