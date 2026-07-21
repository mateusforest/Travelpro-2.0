"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText, Loader2, Paperclip, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { getClientsAction, type ClientStatus } from "@/actions/clients"
import { getContractsAction, type ContractStatus } from "@/actions/contracts"
import {
  createDocumentAction,
  deleteDocumentAction,
  getDocumentsAction,
  updateDocumentAction,
  type DocumentStatus,
  type DocumentType,
} from "@/actions/documents"
import { getQuotesAction, type QuoteStatus } from "@/actions/quotes"
import { getTripsAction, type TripStatus } from "@/actions/trips"
import { useAuth } from "@/components/auth/auth-provider"

type DocumentRecord = {
  id: string
  clientId: string | null
  tripId: string | null
  quoteId: string | null
  contractId: string | null
  title: string
  type: DocumentType
  fileUrl: string
  content: string
  status: DocumentStatus
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

type QuoteOption = {
  id: string
  title: string
  status: QuoteStatus
}

type ContractOption = {
  id: string
  title: string
  status: ContractStatus
}

type DocumentFormState = {
  clientId: string
  tripId: string
  quoteId: string
  contractId: string
  title: string
  type: DocumentType
  fileUrl: string
  content: string
  status: DocumentStatus
}

const defaultForm: DocumentFormState = {
  clientId: "",
  tripId: "",
  quoteId: "",
  contractId: "",
  title: "",
  type: "outro",
  fileUrl: "",
  content: "",
  status: "draft",
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

function statusLabel(status: DocumentStatus) {
  if (status === "sent") return "Enviado"
  if (status === "signed") return "Assinado"
  if (status === "archived") return "Arquivado"
  return "Rascunho"
}

function typeLabel(type: DocumentType) {
  if (type === "relatorio") return "Relatorio"
  if (type === "recibo") return "Recibo"
  if (type === "nota_fiscal") return "Nota fiscal"
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function normalizeFilterType(filterType?: string | null): DocumentType | null {
  if (!filterType) return null
  const normalized = filterType.trim().toLowerCase()
  if (normalized === "contrato" || normalized === "contratos") return "contrato"
  if (normalized === "arquivo" || normalized === "arquivos" || normalized === "documento" || normalized === "documentos") return "arquivo"
  if (normalized === "relatorio" || normalized === "relatorios") return "relatorio"
  if (normalized === "proposta" || normalized === "propostas") return "proposta"
  if (normalized === "recibo" || normalized === "recibos") return "recibo"
  if (normalized === "nota fiscal" || normalized === "notas fiscais" || normalized === "nota-fiscal" || normalized === "notas-fiscais") return "nota_fiscal"
  return null
}

function resolveModuleCopy(type: DocumentType | null) {
  if (type === "arquivo") {
    return {
      singular: "arquivo",
      singularCapitalized: "Arquivo",
      plural: "arquivos",
      loading: "Carregando arquivos...",
      empty: "Nenhum arquivo criado ainda.",
      save: "Salvar arquivo",
      create: "Novo arquivo",
      edit: "Editar arquivo",
      helper: "Salve metadados reais e vincule o arquivo aos registros da operacao.",
    }
  }

  if (type === "relatorio") {
    return {
      singular: "relatorio",
      singularCapitalized: "Relatorio",
      plural: "relatorios",
      loading: "Carregando relatorios...",
      empty: "Nenhum relatorio criado ainda.",
      save: "Salvar relatorio",
      create: "Novo relatorio",
      edit: "Editar relatorio",
      helper: "Salve metadados reais e vincule o relatorio aos registros da operacao.",
    }
  }

  if (type === "recibo") {
    return {
      singular: "recibo",
      singularCapitalized: "Recibo",
      plural: "recibos",
      loading: "Carregando recibos...",
      empty: "Nenhum recibo criado ainda.",
      save: "Salvar recibo",
      create: "Novo recibo",
      edit: "Editar recibo",
      helper: "Salve metadados reais e vincule o recibo aos registros da operacao.",
    }
  }

  if (type === "nota_fiscal") {
    return {
      singular: "nota fiscal",
      singularCapitalized: "Nota fiscal",
      plural: "notas fiscais",
      loading: "Carregando notas fiscais...",
      empty: "Nenhuma nota fiscal criada ainda.",
      save: "Salvar nota fiscal",
      create: "Nova nota fiscal",
      edit: "Editar nota fiscal",
      helper: "Salve metadados reais e vincule a nota fiscal aos registros da operacao.",
    }
  }

  if (type === "contrato") {
    return {
      singular: "contrato",
      singularCapitalized: "Contrato",
      plural: "contratos",
      loading: "Carregando contratos...",
      empty: "Nenhum contrato criado ainda.",
      save: "Salvar contrato",
      create: "Novo contrato",
      edit: "Editar contrato",
      helper: "Salve metadados reais e vincule o contrato aos registros da operacao.",
    }
  }

  if (type === "proposta") {
    return {
      singular: "proposta",
      singularCapitalized: "Proposta",
      plural: "propostas",
      loading: "Carregando propostas...",
      empty: "Nenhuma proposta criada ainda.",
      save: "Salvar proposta",
      create: "Nova proposta",
      edit: "Editar proposta",
      helper: "Salve metadados reais e vincule a proposta aos registros da operacao.",
    }
  }

  return {
    singular: "documento",
    singularCapitalized: "Documento",
    plural: "documentos",
    loading: "Carregando documentos...",
    empty: "Nenhum documento criado ainda.",
    save: "Salvar documento",
    create: "Novo documento",
    edit: "Editar documento",
    helper: "Salve metadados reais e vincule o documento aos registros da operacao.",
  }
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
  const [clients, setClients] = useState<ClientOption[]>([])
  const [trips, setTrips] = useState<TripOption[]>([])
  const [quotes, setQuotes] = useState<QuoteOption[]>([])
  const [contracts, setContracts] = useState<ContractOption[]>([])
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
  const moduleCopy = resolveModuleCopy(currentTypeFilter)
  const clientsMap = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients])
  const tripsMap = useMemo(() => new Map(trips.map((trip) => [trip.id, trip.title])), [trips])
  const quotesMap = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote.title])), [quotes])
  const contractsMap = useMemo(() => new Map(contracts.map((contract) => [contract.id, contract.title])), [contracts])

  const loadDocuments = async () => {
    setIsLoading(true)
    setError(null)

    const [result, clientsResult, tripsResult, quotesResult, contractsResult] = await Promise.all([
      getDocumentsAction(),
      getClientsAction(),
      getTripsAction(),
      getQuotesAction(),
      getContractsAction(),
    ])

    if (result.error) {
      setError(result.error)
      setDocuments([])
      setIsLoading(false)
      return
    }

    setDocuments((result.documents ?? []) as DocumentRecord[])
    setClients(((clientsResult.clients ?? []) as ClientOption[]).filter((client) => client.status === "active"))
    setTrips(((tripsResult.trips ?? []) as TripOption[]).filter((trip) => trip.status !== "archived"))
    setQuotes(((quotesResult.quotes ?? []) as QuoteOption[]).filter((quote) => quote.status !== "archived"))
    setContracts(((contractsResult.contracts ?? []) as ContractOption[]).filter((contract) => contract.status !== "archived"))
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
      const matchesSearch =
        !term ||
        [
          document.title,
          document.type,
          document.content,
          document.clientId ? clientsMap.get(document.clientId) ?? "" : "",
          document.tripId ? tripsMap.get(document.tripId) ?? "" : "",
          document.quoteId ? quotesMap.get(document.quoteId) ?? "" : "",
          document.contractId ? contractsMap.get(document.contractId) ?? "" : "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      return matchesStatus && matchesType && matchesSearch
    })
  }, [clientsMap, contractsMap, currentTypeFilter, documents, filter, quotesMap, search, tripsMap])

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
      clientId: document.clientId ?? "",
      tripId: document.tripId ?? "",
      quoteId: document.quoteId ?? "",
      contractId: document.contractId ?? "",
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
      clientId: form.clientId || undefined,
      tripId: form.tripId || undefined,
      quoteId: form.quoteId || undefined,
      contractId: form.contractId || undefined,
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
            disabled={!canManageWorkspace}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {moduleCopy.create}
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
                placeholder={`Buscar por titulo, tipo, cliente, viagem ou conteudo de ${moduleCopy.plural}...`}
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
              {moduleCopy.loading}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">{moduleCopy.empty}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">Titulo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Viagem</th>
                    <th className="px-4 py-3">Contrato</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Conteudo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{document.title}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{document.clientId ? clientsMap.get(document.clientId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{document.tripId ? tripsMap.get(document.tripId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{document.contractId ? contractsMap.get(document.contractId) ?? "-" : "-"}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{typeLabel(document.type)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{document.content || "-"}</td>
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
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-2xl lg:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <FileText className="h-5 w-5 text-blue-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingDocumentId ? moduleCopy.edit : moduleCopy.create}</h2>
                <p className="text-sm text-gray-500">{moduleCopy.helper}</p>
              </div>
            </div>

            {!canManageWorkspace && editingDocumentId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                Apenas owner, admin ou master podem editar e arquivar documentos.
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Cliente">
                  <select value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="">Sem cliente vinculado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Viagem">
                  <select value={form.tripId} onChange={(event) => setForm((prev) => ({ ...prev, tripId: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
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
                <FormField label="Cotacao">
                  <select value={form.quoteId} onChange={(event) => setForm((prev) => ({ ...prev, quoteId: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="">Sem cotacao vinculada</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.title}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Contrato">
                  <select value={form.contractId} onChange={(event) => setForm((prev) => ({ ...prev, contractId: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="">Sem contrato vinculado</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.title}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Titulo">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Titulo do documento" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="Tipo">
                  <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as DocumentType }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                    <option value="contrato">Contrato</option>
                    <option value="arquivo">Arquivo</option>
                    <option value="relatorio">Relatorio</option>
                    <option value="proposta">Proposta</option>
                    <option value="recibo">Recibo</option>
                    <option value="nota_fiscal">Nota fiscal</option>
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

              <FormField label="Referencia do arquivo">
                <div className="relative">
                  <Paperclip className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={form.fileUrl} onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))} placeholder="URL ou referencia do arquivo" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </div>
              </FormField>

              <FormField label="Conteudo">
                <textarea value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} placeholder="Escreva o conteudo ou resumo do documento" rows={5} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              O upload real continua fora deste escopo. Nesta etapa salvamos apenas metadados e referencias do documento.
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
                {isSaving ? "Salvando..." : editingDocumentId ? "Salvar alteracoes" : moduleCopy.save}
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
