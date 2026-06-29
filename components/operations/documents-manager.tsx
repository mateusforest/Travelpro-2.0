"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText, Loader2, Paperclip, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  createDocumentAction,
  deleteDocumentAction,
  getDocumentsAction,
  updateDocumentAction,
  type DocumentStatus,
  type DocumentType,
} from "@/actions/documents"
import { useAuth } from "@/components/auth/auth-provider"

type DocumentRecord = {
  id: string
  title: string
  type: DocumentType
  fileUrl: string
  content: string
  status: DocumentStatus
  createdAt: string | null
}

type DocumentFormState = {
  title: string
  type: DocumentType
  fileUrl: string
  content: string
  status: DocumentStatus
}

const defaultForm: DocumentFormState = {
  title: "",
  type: "outro",
  fileUrl: "",
  content: "",
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

function statusLabel(status: DocumentStatus) {
  if (status === "sent") return "Enviado"
  if (status === "signed") return "Assinado"
  if (status === "archived") return "Arquivado"
  return "Rascunho"
}

function typeLabel(type: DocumentType) {
  if (type === "relatório") return "Relatório"
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function normalizeFilterType(filterType?: string | null): DocumentType | null {
  if (!filterType) return null
  const normalized = filterType.trim().toLowerCase()
  if (normalized === "contrato" || normalized === "contratos") return "contrato"
  if (normalized === "arquivo" || normalized === "arquivos") return "arquivo"
  if (normalized === "relatório" || normalized === "relatorios" || normalized === "relatórios" || normalized === "relatorio" || normalized === "relatórios") return "relatório"
  if (normalized === "proposta" || normalized === "propostas") return "proposta"
  return null
}

export function DocumentsManager({
  title,
  description,
  variant,
  filterType,
}: {
  title: string
  description: string
  variant: "app" | "portal"
  filterType?: string
}) {
  const { canManageWorkspace } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | DocumentStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [form, setForm] = useState<DocumentFormState>({
    ...defaultForm,
    type: normalizeFilterType(filterType) ?? "outro",
  })

  const currentTypeFilter = normalizeFilterType(filterType)

  const loadDocuments = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getDocumentsAction()

    if (result.error) {
      setError(result.error)
      setDocuments([])
      setIsLoading(false)
      return
    }

    setDocuments((result.documents ?? []) as DocumentRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const matchesStatus = filter === "all" ? true : document.status === filter
      const matchesType = currentTypeFilter ? document.type === currentTypeFilter : true
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [document.title, document.type, document.content].join(" ").toLowerCase().includes(term)
      return matchesStatus && matchesType && matchesSearch
    })
  }, [currentTypeFilter, documents, filter, search])

  const startCreate = () => {
    setEditingDocumentId(null)
    setForm({
      ...defaultForm,
      type: currentTypeFilter ?? "outro",
    })
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (document: DocumentRecord) => {
    setEditingDocumentId(document.id)
    setForm({
      title: document.title,
      type: document.type,
      fileUrl: document.fileUrl,
      content: document.content,
      status: document.status,
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
      type: form.type,
      fileUrl: form.fileUrl,
      content: form.content,
      status: form.status,
    }

    const result = editingDocumentId
      ? await updateDocumentAction({ documentId: editingDocumentId, ...payload })
      : await createDocumentAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingDocumentId ? "Documento atualizado com sucesso." : "Documento criado com sucesso.")
    setModalOpen(false)
    await loadDocuments()
  }

  const archiveDocument = async (documentId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteDocumentAction({ documentId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Documento arquivado com sucesso.")
    await loadDocuments()
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
            Novo documento
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
                placeholder="Buscar por título, tipo ou conteúdo..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todos", value: "all" as const },
                { label: "Rascunhos", value: "draft" as const },
                { label: "Enviados", value: "sent" as const },
                { label: "Assinados", value: "signed" as const },
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
              Carregando documentos...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhum documento criado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Conteúdo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{document.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{typeLabel(document.type)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{document.content || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          document.status === "signed"
                            ? "bg-emerald-50 text-emerald-600"
                            : document.status === "sent"
                              ? "bg-blue-50 text-blue-600"
                              : document.status === "archived"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-amber-50 text-amber-700"
                        }`}>
                          {statusLabel(document.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(document.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(document)}
                            disabled={!canManageWorkspace}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => archiveDocument(document.id)}
                            disabled={!canManageWorkspace || document.status === "archived"}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <FileText className="h-5 w-5 text-blue-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingDocumentId ? "Editar documento" : "Novo documento"}</h2>
                <p className="text-sm text-gray-500">Salve conteúdo real e mantenha o upload apenas como metadado enquanto o storage não estiver conectado.</p>
              </div>
            </div>

            {!canManageWorkspace && editingDocumentId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e arquivar documentos.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label="Título">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título do documento" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Tipo">
                  <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as DocumentType }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="contrato">Contrato</option>
                    <option value="arquivo">Arquivo</option>
                    <option value="relatório">Relatório</option>
                    <option value="proposta">Proposta</option>
                    <option value="outro">Outro</option>
                  </select>
                </FormField>
                <FormField label="Status">
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as DocumentStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviado</option>
                    <option value="signed">Assinado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Referência do arquivo">
                <div className="relative">
                  <Paperclip className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.fileUrl} onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))} placeholder="URL ou referência do arquivo" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </div>
              </FormField>
              <FormField label="Conteúdo">
                <textarea value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} placeholder="Escreva o conteúdo ou resumo do documento" rows={5} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              O upload real pode continuar visível na interface, mas nesta etapa apenas metadados e conteúdo são salvos.
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingDocumentId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingDocumentId ? "Salvar alterações" : "Salvar documento"}
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
