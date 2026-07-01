"use client"

import { useEffect, useMemo, useState } from "react"
import { Briefcase, CalendarDays, Loader2, Pencil, Plus, Search } from "lucide-react"
import { getClientsAction, type ClientStatus } from "@/actions/clients"
import {
  createTripAction,
  getTripsAction,
  updateTripAction,
  type TripStatus,
} from "@/actions/trips"
import { useAuth } from "@/components/auth/auth-provider"

type TripRecord = {
  id: string
  clientId: string | null
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  travelerCount: number
  status: TripStatus
  notes: string
  createdAt: string | null
}

type ClientOption = {
  id: string
  name: string
  status: ClientStatus
}

type TripFormState = {
  clientId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  travelerCount: string
  status: TripStatus
  notes: string
}

const defaultForm: TripFormState = {
  clientId: "",
  title: "",
  destination: "",
  startDate: "",
  endDate: "",
  travelerCount: "1",
  status: "draft",
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

function tripStatusLabel(status: TripStatus) {
  if (status === "planning") return "Planejamento"
  if (status === "confirmed") return "Confirmada"
  if (status === "in_progress") return "Em andamento"
  if (status === "completed") return "Concluida"
  if (status === "cancelled") return "Cancelada"
  if (status === "archived") return "Arquivada"
  return "Rascunho"
}

function tripStatusTone(status: TripStatus) {
  if (status === "completed") return "bg-emerald-50 text-emerald-600"
  if (status === "cancelled" || status === "archived") return "bg-gray-100 text-gray-600"
  if (status === "confirmed") return "bg-blue-50 text-blue-600"
  if (status === "in_progress") return "bg-amber-50 text-amber-700"
  return "bg-violet-50 text-violet-600"
}

export function TripsManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | TripStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [form, setForm] = useState<TripFormState>(defaultForm)

  const clientsMap = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients])

  const loadTrips = async () => {
    setIsLoading(true)
    setError(null)

    const [tripsResult, clientsResult] = await Promise.all([getTripsAction(), getClientsAction()])

    if (tripsResult.error) {
      setError(tripsResult.error)
      setTrips([])
      setIsLoading(false)
      return
    }

    setTrips((tripsResult.trips ?? []) as TripRecord[])
    setClients(
      ((clientsResult.clients ?? []) as Array<{ id: string; name: string; status: ClientStatus }>)
        .filter((client) => client.status === "active"),
    )
    setIsLoading(false)
  }

  useEffect(() => {
    void loadTrips()
  }, [])

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesFilter = filter === "all" ? true : trip.status === filter
      const term = search.trim().toLowerCase()
      const clientName = trip.clientId ? clientsMap.get(trip.clientId) ?? "" : ""
      const matchesSearch = !term || [trip.title, trip.destination, trip.notes, clientName].join(" ").toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [clientsMap, filter, search, trips])

  const startCreate = () => {
    setEditingTripId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (trip: TripRecord) => {
    setEditingTripId(trip.id)
    setForm({
      clientId: trip.clientId ?? "",
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate ? trip.startDate.slice(0, 10) : "",
      endDate: trip.endDate ? trip.endDate.slice(0, 10) : "",
      travelerCount: String(trip.travelerCount || 1),
      status: trip.status,
      notes: trip.notes,
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
      title: form.title,
      destination: form.destination,
      startDate: form.startDate,
      endDate: form.endDate,
      travelerCount: form.travelerCount,
      status: form.status,
      notes: form.notes,
    }

    const result = editingTripId
      ? await updateTripAction({ tripId: editingTripId, ...payload })
      : await createTripAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingTripId ? "Viagem atualizada com sucesso." : "Viagem criada com sucesso.")
    setModalOpen(false)
    await loadTrips()
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <Plus className="h-4 w-4" />
            Nova viagem
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
                placeholder="Buscar por titulo, destino, cliente ou observacoes..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Rascunho", value: "draft" as const },
                { label: "Planejamento", value: "planning" as const },
                { label: "Confirmadas", value: "confirmed" as const },
                { label: "Em andamento", value: "in_progress" as const },
                { label: "Concluidas", value: "completed" as const },
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
              Carregando viagens...
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma viagem cadastrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Titulo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3">Viajantes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{trip.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{trip.clientId ? clientsMap.get(trip.clientId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{trip.destination || "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">
                        {trip.startDate || trip.endDate ? `${formatDateLabel(trip.startDate)} - ${formatDateLabel(trip.endDate)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{trip.travelerCount}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tripStatusTone(trip.status)}`}>
                          {tripStatusLabel(trip.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(trip)}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
                <Briefcase className="h-5 w-5 text-violet-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingTripId ? "Editar viagem" : "Nova viagem"}</h2>
                <p className="text-sm text-gray-500">Registre viagens reais da agencia e vincule ao cliente quando fizer sentido.</p>
              </div>
            </div>

            {!canManageWorkspace && editingTripId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar viagens.
              </div>
            )}

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
                <FormField label="Viajantes">
                  <input
                    type="number"
                    min="1"
                    value={form.travelerCount}
                    onChange={(event) => setForm((prev) => ({ ...prev, travelerCount: event.target.value }))}
                    placeholder="1"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </FormField>
              </div>

              <FormField label="Titulo">
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Titulo da viagem"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>

              <FormField label="Destino">
                <input
                  value={form.destination}
                  onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
                  placeholder="Destino principal"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>

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

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TripStatus }))}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                >
                  <option value="draft">Rascunho</option>
                  <option value="planning">Planejamento</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="completed">Concluida</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="archived">Arquivada</option>
                </select>
              </FormField>

              <FormField label="Observacoes">
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Observacoes da viagem"
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
                disabled={isSaving || (Boolean(editingTripId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingTripId ? "Salvar alteracoes" : "Salvar viagem"}
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
