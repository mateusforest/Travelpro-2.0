"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, Video } from "lucide-react"
import {
  createMeetingAction,
  deleteMeetingAction,
  getMeetingsAction,
  updateMeetingAction,
  type MeetingStatus,
} from "@/actions/meetings"
import { useAuth } from "@/components/auth/auth-provider"
import { publishOperationSync, subscribeOperationSync } from "@/lib/operation-sync"

type MeetingRecord = {
  id: string
  title: string
  audioUrl: string
  transcript: string
  summary: string
  decisions: string
  nextSteps: string
  status: MeetingStatus
  createdAt: string | null
}

type MeetingFormState = {
  title: string
  summary: string
  decisions: string
  nextSteps: string
  audioUrl: string
  status: MeetingStatus
}

const defaultForm: MeetingFormState = {
  title: "",
  summary: "",
  decisions: "",
  nextSteps: "",
  audioUrl: "",
  status: "draft",
}

function formatDateLabel(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function statusLabel(status: MeetingStatus) {
  if (status === "recorded") return "Gravada"
  if (status === "transcribed") return "Transcrita"
  if (status === "archived") return "Arquivada"
  return "Rascunho"
}

export function MeetingsManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | MeetingStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [form, setForm] = useState<MeetingFormState>(defaultForm)

  const loadMeetings = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getMeetingsAction()

    if (result.error) {
      setError(result.error)
      setMeetings([])
      setIsLoading(false)
      return
    }

    setMeetings((result.meetings ?? []) as MeetingRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadMeetings()
  }, [])

  useEffect(() => {
    return subscribeOperationSync(() => {
      void loadMeetings()
    })
  }, [])

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesFilter = filter === "all" ? true : meeting.status === filter
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [meeting.title, meeting.summary, meeting.decisions, meeting.nextSteps].join(" ").toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [filter, meetings, search])

  const startCreate = () => {
    setEditingMeetingId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (meeting: MeetingRecord) => {
    setEditingMeetingId(meeting.id)
    setForm({
      title: meeting.title,
      summary: meeting.summary,
      decisions: meeting.decisions,
      nextSteps: meeting.nextSteps,
      audioUrl: meeting.audioUrl,
      status: meeting.status,
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
      title: form.title,
      summary: form.summary,
      decisions: form.decisions,
      nextSteps: form.nextSteps,
      audioUrl: form.audioUrl,
      status: form.status,
    }

    const result = editingMeetingId
      ? await updateMeetingAction({ meetingId: editingMeetingId, ...payload })
      : await createMeetingAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingMeetingId ? "Reunião atualizada com sucesso." : "Reunião criada com sucesso.")
    setModalOpen(false)
    publishOperationSync({ source: "portal" })
    await loadMeetings()
  }

  const archiveMeeting = async (meetingId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteMeetingAction({ meetingId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Reunião arquivada com sucesso.")
    publishOperationSync({ source: "portal" })
    await loadMeetings()
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
            Nova reunião
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
                placeholder="Buscar por título, resumo ou próximos passos..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Rascunhos", value: "draft" as const },
                { label: "Gravadas", value: "recorded" as const },
                { label: "Transcritas", value: "transcribed" as const },
                { label: "Arquivadas", value: "archived" as const },
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
              Carregando reuniões...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma reunião registrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Resumo</th>
                    <th className="px-4 py-3">Próximos passos</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map((meeting) => (
                    <tr key={meeting.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{meeting.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{meeting.summary || "—"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{meeting.nextSteps || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          meeting.status === "transcribed"
                            ? "bg-emerald-50 text-emerald-600"
                            : meeting.status === "recorded"
                              ? "bg-blue-50 text-blue-600"
                              : meeting.status === "archived"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-amber-50 text-amber-700"
                        }`}>
                          {statusLabel(meeting.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(meeting.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(meeting)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => archiveMeeting(meeting.id)}
                            disabled={!canManageWorkspace || meeting.status === "archived"}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Arquivar
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
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-lg lg:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
                <Video className="h-5 w-5 text-red-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingMeetingId ? "Editar reunião" : "Nova reunião"}</h2>
                <p className="text-sm text-gray-500">Transcrição será ativada quando a IA estiver conectada.</p>
              </div>
            </div>

            {!canManageWorkspace && editingMeetingId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e arquivar reuniões.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Título">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título da reunião" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Participantes e observações">
                <textarea value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="Participantes, observações e contexto da reunião" rows={4} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Decisões">
                <textarea value={form.decisions} onChange={(event) => setForm((prev) => ({ ...prev, decisions: event.target.value }))} placeholder="Principais decisões" rows={3} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Próximos passos">
                <textarea value={form.nextSteps} onChange={(event) => setForm((prev) => ({ ...prev, nextSteps: event.target.value }))} placeholder="Próximos passos" rows={3} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Áudio">
                <input value={form.audioUrl} onChange={(event) => setForm((prev) => ({ ...prev, audioUrl: event.target.value }))} placeholder="Referência do áudio, se houver" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as MeetingStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                  <option value="draft">Rascunho</option>
                  <option value="recorded">Gravada</option>
                  <option value="transcribed">Transcrita</option>
                  <option value="archived">Arquivada</option>
                </select>
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingMeetingId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingMeetingId ? "Salvar alterações" : "Salvar reunião"}
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
