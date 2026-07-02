"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Loader2, Pencil, Plus, Search, Ticket } from "lucide-react"
import { getBookingSuppliersAction, createBookingAction, getBookingsAction, updateBookingAction, type BookingStatus, type BookingType } from "@/actions/bookings"
import { getClientsAction, type ClientStatus } from "@/actions/clients"
import { getQuotesAction, type QuoteStatus } from "@/actions/quotes"
import { getTripsAction, type TripStatus } from "@/actions/trips"
import { useAuth } from "@/components/auth/auth-provider"

type BookingRecord = {
  id: string
  tripId: string | null
  clientId: string | null
  supplierId: string | null
  quoteId: string | null
  bookingType: BookingType
  referenceCode: string
  status: BookingStatus
  startDate: string | null
  endDate: string | null
  amount: number
  currency: string
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

type SupplierOption = {
  id: string
  name: string
  status: "active" | "inactive"
}

type QuoteOption = {
  id: string
  title: string
  status: QuoteStatus
}

type BookingFormState = {
  clientId: string
  tripId: string
  supplierId: string
  quoteId: string
  bookingType: BookingType
  referenceCode: string
  status: BookingStatus
  startDate: string
  endDate: string
  amount: string
  currency: string
  notes: string
}

const defaultForm: BookingFormState = {
  clientId: "",
  tripId: "",
  supplierId: "",
  quoteId: "",
  bookingType: "other",
  referenceCode: "",
  status: "draft",
  startDate: "",
  endDate: "",
  amount: "0,00",
  currency: "BRL",
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

function bookingStatusLabel(status: BookingStatus) {
  if (status === "requested") return "Solicitada"
  if (status === "confirmed") return "Confirmada"
  if (status === "ticketed") return "Emitida"
  if (status === "cancelled") return "Cancelada"
  if (status === "completed") return "Concluida"
  return "Rascunho"
}

function bookingStatusTone(status: BookingStatus) {
  if (status === "completed") return "bg-emerald-50 text-emerald-600"
  if (status === "cancelled") return "bg-gray-100 text-gray-600"
  if (status === "confirmed" || status === "ticketed") return "bg-blue-50 text-blue-600"
  if (status === "requested") return "bg-amber-50 text-amber-700"
  return "bg-violet-50 text-violet-600"
}

function bookingTypeLabel(type: BookingType) {
  if (type === "flight") return "Voo"
  if (type === "hotel") return "Hotel"
  if (type === "tour") return "Passeio"
  if (type === "transfer") return "Transfer"
  if (type === "insurance") return "Seguro"
  return "Outro"
}

export function BookingsManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [trips, setTrips] = useState<TripOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [quotes, setQuotes] = useState<QuoteOption[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | BookingStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null)
  const [form, setForm] = useState<BookingFormState>(defaultForm)

  const clientsMap = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients])
  const tripsMap = useMemo(() => new Map(trips.map((trip) => [trip.id, trip.title])), [trips])
  const suppliersMap = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])), [suppliers])
  const quotesMap = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote.title])), [quotes])

  const loadBookings = async () => {
    setIsLoading(true)
    setError(null)

    const [bookingsResult, clientsResult, tripsResult, suppliersResult, quotesResult] = await Promise.all([
      getBookingsAction(),
      getClientsAction(),
      getTripsAction(),
      getBookingSuppliersAction(),
      getQuotesAction(),
    ])

    if (bookingsResult.error) {
      setError(bookingsResult.error)
      setBookings([])
      setIsLoading(false)
      return
    }

    setBookings((bookingsResult.bookings ?? []) as BookingRecord[])
    setClients(
      ((clientsResult.clients ?? []) as Array<{ id: string; name: string; status: ClientStatus }>)
        .filter((client) => client.status === "active"),
    )
    setTrips(
      ((tripsResult.trips ?? []) as Array<{ id: string; title: string; status: TripStatus }>)
        .filter((trip) => trip.status !== "archived"),
    )
    setSuppliers((suppliersResult.suppliers ?? []) as SupplierOption[])
    setQuotes(((quotesResult.quotes ?? []) as QuoteOption[]).filter((quote) => quote.status !== "archived"))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadBookings()
  }, [])

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesFilter = filter === "all" ? true : booking.status === filter
      const term = search.trim().toLowerCase()
      const clientName = booking.clientId ? clientsMap.get(booking.clientId) ?? "" : ""
      const tripName = booking.tripId ? tripsMap.get(booking.tripId) ?? "" : ""
      const supplierName = booking.supplierId ? suppliersMap.get(booking.supplierId) ?? "" : ""
      const quoteTitle = booking.quoteId ? quotesMap.get(booking.quoteId) ?? "" : ""
      const matchesSearch =
        !term || [booking.referenceCode, booking.notes, clientName, tripName, supplierName, quoteTitle].join(" ").toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [bookings, clientsMap, filter, quotesMap, search, suppliersMap, tripsMap])

  const startCreate = () => {
    setEditingBookingId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (booking: BookingRecord) => {
    setEditingBookingId(booking.id)
    setForm({
      clientId: booking.clientId ?? "",
      tripId: booking.tripId ?? "",
      supplierId: booking.supplierId ?? "",
      quoteId: booking.quoteId ?? "",
      bookingType: booking.bookingType,
      referenceCode: booking.referenceCode,
      status: booking.status,
      startDate: booking.startDate ? booking.startDate.slice(0, 10) : "",
      endDate: booking.endDate ? booking.endDate.slice(0, 10) : "",
      amount: String(booking.amount ?? 0).replace(".", ","),
      currency: booking.currency || "BRL",
      notes: booking.notes,
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
      supplierId: form.supplierId || undefined,
      quoteId: form.quoteId || undefined,
      bookingType: form.bookingType,
      referenceCode: form.referenceCode,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      amount: form.amount,
      currency: form.currency,
      notes: form.notes,
    }

    const result = editingBookingId
      ? await updateBookingAction({ bookingId: editingBookingId, ...payload })
      : await createBookingAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingBookingId ? "Reserva atualizada com sucesso." : "Reserva criada com sucesso.")
    setModalOpen(false)
    await loadBookings()
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
            Nova reserva
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
                placeholder="Buscar por referencia, cliente, viagem, fornecedor ou cotacao..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Rascunho", value: "draft" as const },
                { label: "Solicitadas", value: "requested" as const },
                { label: "Confirmadas", value: "confirmed" as const },
                { label: "Emitidas", value: "ticketed" as const },
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
              Carregando reservas...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma reserva cadastrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Viagem</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Cotacao</th>
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{booking.referenceCode || "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{bookingTypeLabel(booking.bookingType)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{booking.clientId ? clientsMap.get(booking.clientId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{booking.tripId ? tripsMap.get(booking.tripId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{booking.supplierId ? suppliersMap.get(booking.supplierId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{booking.quoteId ? quotesMap.get(booking.quoteId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">
                        {booking.startDate || booking.endDate ? `${formatDateLabel(booking.startDate)} - ${formatDateLabel(booking.endDate)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatAmountLabel(booking.amount, booking.currency)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusTone(booking.status)}`}>
                          {bookingStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(booking)}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50">
                <Ticket className="h-5 w-5 text-sky-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingBookingId ? "Editar reserva" : "Nova reserva"}</h2>
                <p className="text-sm text-gray-500">Registre reservas reais da agencia e vincule aos registros necessarios.</p>
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Fornecedor">
                  <select
                    value={form.supplierId}
                    onChange={(event) => setForm((prev) => ({ ...prev, supplierId: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="">Sem fornecedor vinculado</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Cotacao">
                  <select
                    value={form.quoteId}
                    onChange={(event) => setForm((prev) => ({ ...prev, quoteId: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="">Sem cotacao vinculada</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.title}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Tipo de reserva">
                  <select
                    value={form.bookingType}
                    onChange={(event) => setForm((prev) => ({ ...prev, bookingType: event.target.value as BookingType }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="flight">Voo</option>
                    <option value="hotel">Hotel</option>
                    <option value="tour">Passeio</option>
                    <option value="transfer">Transfer</option>
                    <option value="insurance">Seguro</option>
                    <option value="other">Outro</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormField label="Referencia">
                  <input
                    value={form.referenceCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, referenceCode: event.target.value }))}
                    placeholder="Codigo da reserva"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </FormField>
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as BookingStatus }))}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="requested">Solicitada</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="ticketed">Emitida</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="completed">Concluida</option>
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
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Data de inicio">
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                </FormField>
                <FormField label="Data de fim">
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Valor">
                <input
                  value={form.amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>

              <FormField label="Observacoes">
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Observacoes da reserva"
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
                {isSaving ? "Salvando..." : editingBookingId ? "Salvar alteracoes" : "Salvar reserva"}
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
