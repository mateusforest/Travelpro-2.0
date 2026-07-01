"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Loader2, Pencil, Plus, Search } from "lucide-react"
import {
  createSupplierAction,
  getSuppliersAction,
  updateSupplierAction,
  type SupplierCategory,
  type SupplierStatus,
} from "@/actions/suppliers"
import { useAuth } from "@/components/auth/auth-provider"

type SupplierRecord = {
  id: string
  name: string
  category: SupplierCategory
  contactName: string
  email: string
  phone: string
  website: string
  notes: string
  status: SupplierStatus
  createdAt: string | null
}

type SupplierFormState = {
  name: string
  category: SupplierCategory
  contactName: string
  email: string
  phone: string
  website: string
  notes: string
  status: SupplierStatus
}

const defaultForm: SupplierFormState = {
  name: "",
  category: "other",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
  status: "active",
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

function statusLabel(status: SupplierStatus) {
  if (status === "inactive") return "Inativo"
  if (status === "archived") return "Arquivado"
  return "Ativo"
}

function statusTone(status: SupplierStatus) {
  if (status === "inactive") return "bg-amber-50 text-amber-700"
  if (status === "archived") return "bg-gray-100 text-gray-600"
  return "bg-emerald-50 text-emerald-600"
}

function categoryLabel(category: SupplierCategory) {
  if (category === "airline") return "Aerea"
  if (category === "operator") return "Operadora"
  if (category === "insurance") return "Seguro"
  if (category === "transfer") return "Transfer"
  if (category === "other") return "Outro"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function SuppliersManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | SupplierStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierFormState>(defaultForm)

  const loadSuppliers = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getSuppliersAction()
    if (result.error) {
      setError(result.error)
      setSuppliers([])
      setIsLoading(false)
      return
    }

    setSuppliers((result.suppliers ?? []) as SupplierRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadSuppliers()
  }, [])

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesFilter = filter === "all" ? true : supplier.status === filter
      const term = search.trim().toLowerCase()
      const matchesSearch =
        !term || [supplier.name, supplier.contactName, supplier.email, supplier.phone, supplier.website, supplier.notes].join(" ").toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [filter, search, suppliers])

  const startCreate = () => {
    setEditingSupplierId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (supplier: SupplierRecord) => {
    setEditingSupplierId(supplier.id)
    setForm({
      name: supplier.name,
      category: supplier.category,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      website: supplier.website,
      notes: supplier.notes,
      status: supplier.status,
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
      name: form.name,
      category: form.category,
      contactName: form.contactName,
      email: form.email,
      phone: form.phone,
      website: form.website,
      notes: form.notes,
      status: form.status,
    }

    const result = editingSupplierId
      ? await updateSupplierAction({ supplierId: editingSupplierId, ...payload })
      : await createSupplierAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingSupplierId ? "Fornecedor atualizado com sucesso." : "Fornecedor criado com sucesso.")
    setModalOpen(false)
    await loadSuppliers()
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
            Novo fornecedor
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
                placeholder="Buscar por nome, contato, email ou telefone..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todos", value: "all" as const },
                { label: "Ativos", value: "active" as const },
                { label: "Inativos", value: "inactive" as const },
                { label: "Arquivados", value: "archived" as const },
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
              Carregando fornecedores...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhum fornecedor cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{supplier.name}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{categoryLabel(supplier.category)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{supplier.contactName || "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{supplier.email || "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{supplier.phone || "-"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(supplier.status)}`}>
                          {statusLabel(supplier.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(supplier.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(supplier)}
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
                <Building2 className="h-5 w-5 text-sky-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingSupplierId ? "Editar fornecedor" : "Novo fornecedor"}</h2>
                <p className="text-sm text-gray-500">Registre fornecedores reais da agencia com os dados principais de contato.</p>
              </div>
            </div>

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Nome">
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nome do fornecedor" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Categoria">
                  <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as SupplierCategory }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="hotel">Hotel</option>
                    <option value="airline">Aerea</option>
                    <option value="operator">Operadora</option>
                    <option value="dmc">DMC</option>
                    <option value="insurance">Seguro</option>
                    <option value="transfer">Transfer</option>
                    <option value="other">Outro</option>
                  </select>
                </FormField>
                <FormField label="Status">
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as SupplierStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Contato">
                  <input value={form.contactName} onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))} placeholder="Responsavel" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </FormField>
                <FormField label="Email">
                  <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="contato@fornecedor.com" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Telefone">
                  <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Telefone" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </FormField>
                <FormField label="Website">
                  <input value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} placeholder="https://..." className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </FormField>
              </div>

              <FormField label="Observacoes">
                <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observacoes do fornecedor" rows={4} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
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
                {isSaving ? "Salvando..." : editingSupplierId ? "Salvar alteracoes" : "Salvar fornecedor"}
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
