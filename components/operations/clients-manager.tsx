"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Loader2, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react"
import {
  createClientAction,
  deleteClientAction,
  getClientsAction,
  permanentlyDeleteClientAction,
  updateClientAction,
  type ClientStatus,
} from "@/actions/clients"
import { useAuth } from "@/components/auth/auth-provider"

type ClientRecord = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  notes: string
  status: ClientStatus
  createdAt: string | null
}

type ClientFormState = {
  name: string
  email: string
  phone: string
  company: string
  notes: string
  status: ClientStatus
}

const defaultForm: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  status: "active",
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

function statusLabel(status: ClientStatus) {
  return status === "archived" ? "Arquivado" : "Ativo"
}

export function ClientsManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | ClientStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientFormState>(defaultForm)

  const loadClients = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getClientsAction()

    if (result.error) {
      setError(result.error)
      setClients([])
      setIsLoading(false)
      return
    }

    setClients((result.clients ?? []) as ClientRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadClients()
  }, [])

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesFilter = filter === "all" ? true : client.status === filter
      const term = search.trim().toLowerCase()
      const matchesSearch =
        !term ||
        [client.name, client.email, client.company, client.phone].join(" ").toLowerCase().includes(term)

      return matchesFilter && matchesSearch
    })
  }, [clients, filter, search])

  const startCreate = () => {
    setEditingClientId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (client: ClientRecord) => {
    setEditingClientId(client.id)
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      notes: client.notes,
      status: client.status,
    })
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const result = editingClientId
      ? await updateClientAction({
          clientId: editingClientId,
          ...form,
        })
      : await createClientAction(form)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingClientId ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.")
    setModalOpen(false)
    await loadClients()
  }

  const archiveClient = async (clientId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Deseja arquivar este cliente?")) {
      return
    }

    setError(null)
    setFeedback(null)

    const result = await deleteClientAction({ clientId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Cliente arquivado com sucesso.")
    await loadClients()
  }

  const permanentlyDeleteClient = async (clientId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Deseja excluir este cliente permanentemente? Esta acao nao pode ser desfeita.")
    ) {
      return
    }

    setError(null)
    setFeedback(null)

    const result = await permanentlyDeleteClientAction({ clientId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Cliente excluido permanentemente com sucesso.")
    await loadClients()
  }

  return (
    <div className={variant === "portal" ? "flex-1 flex flex-col h-full" : ""}>
      <div className={variant === "portal" ? "max-w-7xl mx-auto w-full px-6 py-8" : "px-4 py-4 max-w-6xl mx-auto"}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#0a0a0a]">{title}</h1>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo cliente
          </button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {feedback && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, e-mail, empresa ou telefone..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todos", value: "all" as const },
                { label: "Ativos", value: "active" as const },
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
              Carregando clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{client.name}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{client.email || "—"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{client.phone || "—"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{client.company || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${client.status === "archived" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {statusLabel(client.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(client.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(client)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => archiveClient(client.id)}
                            disabled={!canManageWorkspace || client.status === "archived"}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Arquivar
                          </button>
                          <button
                            onClick={() => permanentlyDeleteClient(client.id)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingClientId ? "Editar cliente" : "Novo cliente"}</h2>
                <p className="text-sm text-gray-500">Cadastre clientes reais do seu workspace.</p>
              </div>
            </div>

            {!canManageWorkspace && editingClientId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e arquivar clientes.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Nome">
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nome do cliente" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="E-mail">
                <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="email@empresa.com" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Telefone">
                <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="(11) 99999-9999" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Empresa">
                <input value={form.company} onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))} placeholder="Empresa" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Observações">
                <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observações sobre o cliente" rows={3} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300" />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClientStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:border-gray-300">
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingClientId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Salvando..." : editingClientId ? "Salvar alterações" : "Salvar cliente"}
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
