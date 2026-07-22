"use client"

import { useEffect, useMemo, useState } from "react"
import { Briefcase, CalendarDays, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  createOperationAction,
  deleteOperationAction,
  getOperationsAction,
  updateOperationAction,
  type OperationPriority,
  type OperationStatus,
} from "@/actions/operations"
import { useAuth } from "@/components/auth/auth-provider"
import { publishOperationSync, subscribeOperationSync } from "@/lib/operation-sync"

type OperationRecord = {
  id: string
  clientId: string | null
  title: string
  description: string
  status: OperationStatus
  priority: OperationPriority
  dueDate: string | null
  createdAt: string | null
}

type OperationFormState = {
  title: string
  description: string
  status: OperationStatus
  priority: OperationPriority
  dueDate: string
}

const defaultForm: OperationFormState = {
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  dueDate: "",
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

function statusLabel(status: OperationStatus) {
  if (status === "in_progress") return "Em andamento"
  if (status === "completed") return "Concluída"
  if (status === "archived") return "Arquivada"
  return "Aberta"
}

function priorityLabel(priority: OperationPriority) {
  if (priority === "low") return "Baixa"
  if (priority === "high") return "Alta"
  if (priority === "urgent") return "Urgente"
  return "Média"
}

export function OperationsManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [operations, setOperations] = useState<OperationRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | OperationStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOperationId, setEditingOperationId] = useState<string | null>(null)
  const [form, setForm] = useState<OperationFormState>(defaultForm)

  const loadOperations = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getOperationsAction()

    if (result.error) {
      setError(result.error)
      setOperations([])
      setIsLoading(false)
      return
    }

    setOperations((result.operations ?? []) as OperationRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadOperations()
  }, [])

  useEffect(() => {
    return subscribeOperationSync(() => {
      void loadOperations()
    })
  }, [])

  const filteredOperations = useMemo(() => {
    return operations.filter((operation) => {
      const matchesFilter = filter === "all" ? true : operation.status === filter
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [operation.title, operation.description].join(" ").toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [filter, operations, search])

  const startCreate = () => {
    setEditingOperationId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (operation: OperationRecord) => {
    setEditingOperationId(operation.id)
    setForm({
      title: operation.title,
      description: operation.description,
      status: operation.status,
      priority: operation.priority,
      dueDate: operation.dueDate ? operation.dueDate.slice(0, 10) : "",
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
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
    }

    const result = editingOperationId
      ? await updateOperationAction({ operationId: editingOperationId, ...payload })
      : await createOperationAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingOperationId ? "Operação atualizada com sucesso." : "Operação criada com sucesso.")
    setModalOpen(false)
    publishOperationSync({ source: "portal" })
    await loadOperations()
  }

  const archiveOperation = async (operationId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteOperationAction({ operationId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Operação arquivada com sucesso.")
    publishOperationSync({ source: "portal" })
    await loadOperations()
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
            Nova operação
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
                placeholder="Buscar por título ou descrição..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Abertas", value: "open" as const },
                { label: "Em andamento", value: "in_progress" as const },
                { label: "Concluídas", value: "completed" as const },
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
              Carregando operações...
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma operação cadastrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map((operation) => (
                    <tr key={operation.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{operation.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{operation.description || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          operation.status === "completed"
                            ? "bg-emerald-50 text-emerald-600"
                            : operation.status === "archived"
                              ? "bg-gray-100 text-gray-600"
                              : operation.status === "in_progress"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-600"
                        }`}>
                          {statusLabel(operation.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{priorityLabel(operation.priority)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(operation.dueDate || operation.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(operation)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => archiveOperation(operation.id)}
                            disabled={!canManageWorkspace || operation.status === "archived"}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
                <Briefcase className="h-5 w-5 text-violet-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingOperationId ? "Editar operação" : "Nova operação"}</h2>
                <p className="text-sm text-gray-500">Estruture processos reais do seu workspace.</p>
              </div>
            </div>

            {!canManageWorkspace && editingOperationId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e arquivar operações.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Título">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título da operação" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Descrição">
                <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Detalhes da operação" rows={4} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Status">
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as OperationStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="open">Aberta</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="completed">Concluída</option>
                    <option value="archived">Arquivada</option>
                  </select>
                </FormField>
                <FormField label="Prioridade">
                  <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as OperationPriority }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Prazo">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </div>
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingOperationId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingOperationId ? "Salvar alterações" : "Salvar operação"}
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
