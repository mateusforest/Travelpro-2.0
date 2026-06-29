"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Clock,
  DollarSign,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  createFinancialEntryAction,
  deleteFinancialEntryAction,
  getFinancialEntriesAction,
  getFinancialSummaryAction,
  updateFinancialEntryAction,
  type FinancialEntryType,
} from "@/actions/financial"
import { useAuth } from "@/components/auth/auth-provider"

type FinancialEntry = {
  id: string
  type: FinancialEntryType
  title: string
  amount: number
  category: string
  dueDate: string | null
  paidAt: string | null
  notes: string
  createdAt: string | null
}

type FinancialSummary = {
  totalIncome: number
  totalExpense: number
  balance: number
  monthIncome: number
  monthExpense: number
  monthBalance: number
  pendingAmount: number
  entriesCount: number
}

type FinancialFormState = {
  type: FinancialEntryType
  title: string
  amount: string
  category: string
  dueDate: string
  paidAt: string
  notes: string
}

const defaultForm: FinancialFormState = {
  type: "income",
  title: "",
  amount: "",
  category: "",
  dueDate: "",
  paidAt: "",
  notes: "",
}

function currency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
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

function typeLabel(type: FinancialEntryType) {
  return type === "income" ? "Ganho" : "Gasto"
}

export function FinancialManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "month" | "pending" | "paid">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [form, setForm] = useState<FinancialFormState>(defaultForm)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    const [entriesResult, summaryResult] = await Promise.all([
      getFinancialEntriesAction(),
      getFinancialSummaryAction(),
    ])

    if (entriesResult.error || summaryResult.error) {
      setError(entriesResult.error || summaryResult.error || "Não foi possível carregar o financeiro.")
      setEntries([])
      setSummary(null)
      setIsLoading(false)
      return
    }

    setEntries((entriesResult.entries ?? []) as FinancialEntry[])
    setSummary((summaryResult.summary ?? null) as FinancialSummary | null)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredEntries = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    return entries.filter((entry) => {
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [entry.title, entry.category, entry.notes].join(" ").toLowerCase().includes(term)

      let matchesFilter = true
      const effectiveDate = entry.dueDate || entry.createdAt
      const entryDate = effectiveDate ? new Date(effectiveDate) : null

      if (filter === "income") matchesFilter = entry.type === "income"
      if (filter === "expense") matchesFilter = entry.type === "expense"
      if (filter === "pending") matchesFilter = !entry.paidAt
      if (filter === "paid") matchesFilter = Boolean(entry.paidAt)
      if (filter === "month") matchesFilter = entryDate ? entryDate >= start && entryDate < end : false

      return matchesSearch && matchesFilter
    })
  }, [entries, filter, search])

  const startCreate = (type?: FinancialEntryType) => {
    setEditingEntryId(null)
    setForm({ ...defaultForm, type: type ?? "income" })
    setModalOpen(true)
    setError(null)
    setFeedback(null)
  }

  const startEdit = (entry: FinancialEntry) => {
    setEditingEntryId(entry.id)
    setForm({
      type: entry.type,
      title: entry.title,
      amount: String(entry.amount).replace(".", ","),
      category: entry.category,
      dueDate: entry.dueDate ? entry.dueDate.slice(0, 10) : "",
      paidAt: entry.paidAt ? entry.paidAt.slice(0, 10) : "",
      notes: entry.notes,
    })
    setModalOpen(true)
    setError(null)
    setFeedback(null)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const payload = {
      type: form.type,
      title: form.title,
      amount: form.amount,
      category: form.category,
      dueDate: form.dueDate,
      paidAt: form.paidAt,
      notes: form.notes,
    }

    const result = editingEntryId
      ? await updateFinancialEntryAction({ entryId: editingEntryId, ...payload })
      : await createFinancialEntryAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingEntryId ? "Lançamento atualizado com sucesso." : "Lançamento criado com sucesso.")
    setModalOpen(false)
    await loadData()
  }

  const removeEntry = async (entryId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteFinancialEntryAction({ entryId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Lançamento removido com sucesso.")
    await loadData()
  }

  const previousBalance = (summary?.balance ?? 0) - (summary?.monthBalance ?? 0)
  const cards = [
    { label: "Saldo", value: currency(summary?.balance ?? 0), sublabel: `Saldo anterior = ${currency(previousBalance)}`, icon: Wallet, color: "text-emerald-500" },
    { label: "Ganhos", value: currency(summary?.totalIncome ?? 0), sublabel: "Entradas do workspace", icon: TrendingUp, color: "text-emerald-500" },
    { label: "Gastos", value: currency(summary?.totalExpense ?? 0), sublabel: "Saídas do workspace", icon: TrendingDown, color: "text-red-500" },
    { label: "Lançamentos", value: String(summary?.entriesCount ?? 0), sublabel: "Registros financeiros", icon: DollarSign, color: "text-gray-500" },
  ]

  return (
    <div className={variant === "portal" ? "flex-1 flex flex-col h-full" : ""}>
      <div className={variant === "portal" ? "max-w-7xl mx-auto w-full px-6 py-8" : "px-4 py-4 max-w-6xl mx-auto"}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#0a0a0a]">{title}</h1>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => startCreate("income")} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Registrar ganho
            </button>
            <button onClick={() => startCreate("expense")} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Registrar gasto
            </button>
            <button onClick={() => startCreate()} className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a1a]">
              <Plus className="w-4 h-4" />
              Lançamento
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {feedback && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading && !summary
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <span className="h-5 w-5 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-8 w-28 animate-pulse rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            : cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-sm text-gray-500">{card.label}</span>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-semibold">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.sublabel}</p>
                </div>
              ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, categoria ou observações..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todos", value: "all" as const },
                { label: "Ganhos", value: "income" as const },
                { label: "Gastos", value: "expense" as const },
                { label: "Este mês", value: "month" as const },
                { label: "Pendentes", value: "pending" as const },
                { label: "Pagos", value: "paid" as const },
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
              Carregando financeiro...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhum lançamento financeiro registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{entry.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{typeLabel(entry.type)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{entry.category || "—"}</td>
                      <td className={`px-4 py-3.5 text-sm font-medium ${entry.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                        {entry.type === "income" ? "+" : "-"} {currency(entry.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(entry.dueDate || entry.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${entry.paidAt ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          <Clock className="h-3 w-3" />
                          {entry.paidAt ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(entry)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => removeEntry(entry.id)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                <DollarSign className="h-5 w-5 text-green-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingEntryId ? "Editar lançamento" : "Novo lançamento"}</h2>
                <p className="text-sm text-gray-500">Registre ganhos e gastos reais do seu workspace.</p>
              </div>
            </div>

            {!canManageWorkspace && editingEntryId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e excluir lançamentos.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Tipo">
                <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FinancialEntryType }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300">
                  <option value="income">Ganho</option>
                  <option value="expense">Gasto</option>
                </select>
              </FormField>
              <FormField label="Título">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título do lançamento" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Valor">
                <input value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="0,00" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Categoria">
                <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Categoria" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Data">
                <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Pago em">
                <input type="date" value={form.paidAt} onChange={(event) => setForm((prev) => ({ ...prev, paidAt: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Observações">
                <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observações do lançamento" rows={3} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingEntryId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Salvando..." : editingEntryId ? "Salvar alterações" : "Salvar lançamento"}
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
