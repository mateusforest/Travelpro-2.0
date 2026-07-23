"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  FileText,
  Monitor,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
  UserPlus,
  Video,
  X,
} from "lucide-react"
import { createClientAction } from "@/actions/clients"
import { createDocumentAction } from "@/actions/documents"
import { createMeetingAction } from "@/actions/meetings"
import { createOperationAction } from "@/actions/operations"
import { toast } from "@/hooks/use-toast"
import { publishOperationSync } from "@/lib/operation-sync"

type QuickActionType = "cliente" | "documento" | "operacao" | "reuniao" | "tarefa" | "relatorio"
type PortalModal = "quickActions" | "quickActionForm" | "install" | "meeting" | "delete" | "filters" | null
type FilterKey = "periodo" | "tipo" | "status" | "responsavel" | "area"

type QuickActionConfig = {
  title: string
  description: string
  fields: Array<{ name: string; label: string; placeholder: string }>
  submit: string
}

type PortalInteractionsContextValue = {
  openQuickActions: () => void
  openQuickActionForm: (type: QuickActionType) => void
  openInstall: () => void
  openMeeting: () => void
  openDeleteConfirm: () => void
  openFilters: () => void
  closeModal: () => void
}

const PortalInteractionsContext = createContext<PortalInteractionsContextValue | null>(null)

const quickActionItems: Array<{
  type: QuickActionType
  label: string
  icon: typeof UserPlus
  color: string
  bg: string
}> = [
  { type: "cliente", label: "Cliente", icon: UserPlus, color: "#3b82f6", bg: "#dbeafe" },
  { type: "documento", label: "Documento", icon: FileText, color: "#6366f1", bg: "#e0e7ff" },
  { type: "operacao", label: "Operacao", icon: Briefcase, color: "#8b5cf6", bg: "#ede9fe" },
  { type: "reuniao", label: "Reuniao", icon: Video, color: "#ef4444", bg: "#fee2e2" },
  { type: "tarefa", label: "Tarefa", icon: CheckSquare, color: "#22c55e", bg: "#dcfce7" },
  { type: "relatorio", label: "Relatorio", icon: BarChart3, color: "#f97316", bg: "#ffedd5" },
]

const quickActionConfigs: Record<QuickActionType, QuickActionConfig> = {
  cliente: {
    title: "Novo cliente",
    description: "Prepare o cadastro do proximo cliente do portal.",
    submit: "Salvar cliente",
    fields: [
      { name: "nome", label: "Nome", placeholder: "Nome do cliente" },
      { name: "email", label: "E-mail", placeholder: "E-mail de contato" },
      { name: "telefone", label: "Telefone", placeholder: "Telefone" },
    ],
  },
  documento: {
    title: "Novo documento",
    description: "Organize um novo documento para a operacao.",
    submit: "Salvar documento",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo do documento" },
      { name: "tipo", label: "Tipo", placeholder: "Contrato, arquivo, proposta ou relatorio" },
      { name: "descricao", label: "Conteudo", placeholder: "Resumo ou conteudo do documento" },
    ],
  },
  operacao: {
    title: "Nova operacao",
    description: "Estruture uma nova operacao com dados reais do workspace.",
    submit: "Salvar operacao",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Nome da operacao" },
      { name: "responsavel", label: "Responsavel", placeholder: "Responsavel" },
      { name: "status", label: "Status", placeholder: "Aberta, em andamento ou concluida" },
    ],
  },
  reuniao: {
    title: "Nova reuniao",
    description: "Prepare uma nova reuniao do COS Meet.",
    submit: "Salvar reuniao",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo da reuniao" },
      { name: "participantes", label: "Participantes", placeholder: "Participantes" },
      { name: "observacoes", label: "Observacoes", placeholder: "Observacoes" },
    ],
  },
  tarefa: {
    title: "Nova tarefa",
    description: "Crie uma tarefa operacional no portal.",
    submit: "Salvar tarefa",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo da tarefa" },
      { name: "prazo", label: "Prazo", placeholder: "Prazo" },
      { name: "responsavel", label: "Responsavel", placeholder: "Responsavel" },
    ],
  },
  relatorio: {
    title: "Novo relatorio",
    description: "Prepare a estrutura de um relatorio real no portal.",
    submit: "Salvar relatorio",
    fields: [
      { name: "titulo", label: "Titulo", placeholder: "Titulo do relatorio" },
      { name: "periodo", label: "Periodo", placeholder: "Periodo" },
      { name: "objetivo", label: "Objetivo", placeholder: "Objetivo do relatorio" },
    ],
  },
}

const defaultFilters: Record<FilterKey, string> = {
  periodo: "Este mes",
  tipo: "Operacoes",
  status: "Todos",
  responsavel: "",
  area: "",
}

const filterOptions: Record<Exclude<FilterKey, "responsavel" | "area">, string[]> = {
  periodo: ["Hoje", "Esta semana", "Este mes", "Personalizado"],
  tipo: ["Clientes", "Operacoes", "Financeiro", "Equipe", "Documentos", "Reunioes", "Suporte"],
  status: ["Todos", "Aberto", "Em andamento", "Concluido", "Em preparacao"],
}

export function usePortalInteractions() {
  const ctx = useContext(PortalInteractionsContext)
  if (!ctx) {
    throw new Error("usePortalInteractions deve ser usado dentro de PortalInteractionsProvider")
  }
  return ctx
}

export function PortalInteractionsProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<PortalModal>(null)
  const [selectedAction, setSelectedAction] = useState<QuickActionType>("cliente")
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [meetingValues, setMeetingValues] = useState({
    titulo: "",
    participantes: "",
    observacoes: "",
  })
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const closeModal = () => {
    setModal(null)
    setIsSubmitting(false)
  }

  const value = useMemo<PortalInteractionsContextValue>(
    () => ({
      openQuickActions: () => setModal("quickActions"),
      openQuickActionForm: (type) => {
        setSelectedAction(type)
        setFormValues({})
        setModal("quickActionForm")
      },
      openInstall: () => setModal("install"),
      openMeeting: () => setModal("meeting"),
      openDeleteConfirm: () => setModal("delete"),
      openFilters: () => setModal("filters"),
      closeModal,
    }),
    [],
  )

  const submitQuickAction = async () => {
    setIsSubmitting(true)

    if (selectedAction === "cliente") {
      const result = await createClientAction({
        name: formValues.nome ?? "",
        email: formValues.email ?? "",
        phone: formValues.telefone ?? "",
        company: "",
        notes: "",
        status: "active",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Cliente criado", description: "O cliente foi salvo com sucesso." })
      publishOperationSync({ source: "portal" })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "operacao") {
      const result = await createOperationAction({
        title: formValues.titulo ?? "",
        description: [
          formValues.responsavel ? `Responsavel: ${formValues.responsavel}` : "",
          formValues.status ? `Status desejado: ${formValues.status}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        status: "open",
        priority: "medium",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Operacao criada", description: "A operacao foi salva com sucesso." })
      publishOperationSync({ source: "portal" })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "documento") {
      const result = await createDocumentAction({
        title: formValues.titulo ?? "",
        type: formValues.tipo ?? "outro",
        content: formValues.descricao ?? "",
        status: "draft",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Documento criado", description: "O documento foi salvo com sucesso." })
      publishOperationSync({ source: "portal" })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "reuniao") {
      const result = await createMeetingAction({
        title: formValues.titulo ?? "",
        summary: [
          formValues.participantes ? `Participantes: ${formValues.participantes}` : "",
          formValues.observacoes ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        status: "draft",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Reuniao criada", description: "A reuniao foi salva com sucesso." })
      publishOperationSync({ source: "portal" })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    if (selectedAction === "relatorio") {
      const result = await createDocumentAction({
        title: formValues.titulo ?? "",
        type: "relatorio",
        content: [formValues.periodo ? `Periodo: ${formValues.periodo}` : "", formValues.objetivo ?? ""].filter(Boolean).join("\n"),
        status: "draft",
      })

      if (result.error) {
        setIsSubmitting(false)
        toast({ title: "Nao foi possivel salvar", description: result.error })
        return
      }

      toast({ title: "Relatorio criado", description: "O relatorio foi salvo com sucesso." })
      publishOperationSync({ source: "portal" })
      setIsSubmitting(false)
      setFormValues({})
      closeModal()
      return
    }

    setIsSubmitting(false)
    toast({
      title: "Recurso em preparacao",
      description: "Este fluxo ainda nao possui persistencia real no Portal.",
    })
    setFormValues({})
    closeModal()
  }

  const submitMeetingAction = async (mode: "record" | "upload") => {
    setIsSubmitting(true)

    const result = await createMeetingAction({
      title: meetingValues.titulo ?? "",
      summary: [
        meetingValues.participantes ? `Participantes: ${meetingValues.participantes}` : "",
        meetingValues.observacoes ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
      status: mode === "record" ? "recorded" : "draft",
    })

    setIsSubmitting(false)

    if (result.error) {
      toast({ title: "Nao foi possivel salvar", description: result.error })
      return
    }

    toast({
      title: mode === "record" ? "Reuniao gravada" : "Reuniao preparada",
      description: "A reuniao foi salva com sucesso. A transcricao sera ativada quando a IA estiver conectada.",
    })
    publishOperationSync({ source: "portal" })
    setMeetingValues({ titulo: "", participantes: "", observacoes: "" })
    closeModal()
  }

  const confirmDelete = () => {
    toast({
      title: "Remocao indisponivel",
      description: "Este atalho ainda nao remove itens reais por aqui.",
    })
    closeModal()
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const applyFilters = () => {
    toast({
      title: "Filtros atualizados",
      description: "Os filtros desta tela ainda servem apenas como apoio visual e nao executam busca real.",
    })
    closeModal()
  }

  return (
    <PortalInteractionsContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
            >
              {modal === "quickActions" && (
                <ModalShell title="Acoes rapidas" onClose={closeModal}>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActionItems.map((item) => (
                      <button key={item.type} onClick={() => value.openQuickActionForm(item.type)} className="rounded-2xl border border-gray-100 p-4 text-left transition-colors hover:bg-gray-50">
                        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: item.bg }}>
                          <item.icon className="h-5 w-5" style={{ color: item.color }} />
                        </span>
                        <span className="block text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </ModalShell>
              )}

              {modal === "quickActionForm" && (
                <ModalShell title={quickActionConfigs[selectedAction].title} onClose={closeModal}>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">{quickActionConfigs[selectedAction].description}</p>
                    {quickActionConfigs[selectedAction].fields.map((field) => (
                      <Field key={field.name} label={field.label}>
                        <input
                          type="text"
                          value={formValues[field.name] ?? ""}
                          onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                        />
                      </Field>
                    ))}
                    <button type="button" onClick={submitQuickAction} disabled={isSubmitting} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                      {isSubmitting ? "Salvando..." : quickActionConfigs[selectedAction].submit}
                    </button>
                  </div>
                </ModalShell>
              )}

              {modal === "filters" && (
                <ModalShell title="Filtros" onClose={closeModal}>
                  <div className="space-y-4">
                    <Field label="Periodo">
                      <select value={filters.periodo} onChange={(event) => setFilters((prev) => ({ ...prev, periodo: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                        {filterOptions.periodo.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tipo">
                      <select value={filters.tipo} onChange={(event) => setFilters((prev) => ({ ...prev, tipo: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                        {filterOptions.tipo.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                        {filterOptions.status.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Responsavel">
                      <input type="text" value={filters.responsavel} onChange={(event) => setFilters((prev) => ({ ...prev, responsavel: event.target.value }))} placeholder="Responsavel" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <Field label="Area">
                      <input type="text" value={filters.area} onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))} placeholder="Area" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <div className="flex gap-2">
                      <button type="button" onClick={clearFilters} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Limpar filtros
                      </button>
                      <button type="button" onClick={applyFilters} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                        <SlidersHorizontal className="h-4 w-4" />
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "install" && (
                <ModalShell title="Instalar COS" onClose={closeModal}>
                  <div className="space-y-4">
                    <InstallCard icon={Smartphone} title="iPhone" steps={["Abra o COS no Safari.", "Toque em compartilhar.", "Escolha Adicionar a Tela de Inicio."]} />
                    <InstallCard icon={Smartphone} title="Android" steps={["Abra o COS no Chrome.", "Toque no menu do navegador.", "Escolha Instalar app ou Adicionar a tela inicial."]} />
                    <InstallCard icon={Monitor} title="Desktop" steps={["Abra o COS no navegador compativel.", "Use o icone de instalacao na barra de endereco.", "Confirme para fixar o COS como app."]} />
                  </div>
                </ModalShell>
              )}

              {modal === "meeting" && (
                <ModalShell title="Gravar reuniao" onClose={closeModal}>
                  <div className="space-y-4">
                    <Field label="Titulo">
                      <input type="text" value={meetingValues.titulo} onChange={(event) => setMeetingValues((prev) => ({ ...prev, titulo: event.target.value }))} placeholder="Titulo" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <Field label="Participantes">
                      <input type="text" value={meetingValues.participantes} onChange={(event) => setMeetingValues((prev) => ({ ...prev, participantes: event.target.value }))} placeholder="Participantes" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <Field label="Observacoes">
                      <textarea value={meetingValues.observacoes} onChange={(event) => setMeetingValues((prev) => ({ ...prev, observacoes: event.target.value }))} placeholder="Observacoes" rows={3} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                    </Field>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">A transcricao sera ativada quando a IA estiver conectada.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button type="button" onClick={() => submitMeetingAction("record")} disabled={isSubmitting} className="rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                        {isSubmitting ? "Salvando..." : "Iniciar gravacao"}
                      </button>
                      <button type="button" onClick={() => submitMeetingAction("upload")} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50">
                        <Upload className="h-4 w-4" />
                        Upload de audio
                      </button>
                      <button type="button" onClick={closeModal} disabled={isSubmitting} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "delete" && (
                <ModalShell title="Remover item" onClose={closeModal}>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Tem certeza que deseja remover este item?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={closeModal} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Cancelar
                      </button>
                      <button type="button" onClick={confirmDelete} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PortalInteractionsContext.Provider>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
        <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      {children}
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}

function InstallCard({ icon: Icon, title, steps }: { icon: typeof Smartphone; title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-semibold text-[#0a0a0a]">{title}</span>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <p key={step} className="text-sm text-gray-500">
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}
