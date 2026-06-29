"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Database, FileSpreadsheet, Mail, MessageCircle, Users, Paperclip, Camera, Settings2, Wrench, X, ExternalLink, Plus } from "lucide-react"
import {
  createConnectActionAction,
  createConnectSectionAction,
  createConnectSourceAction,
  deleteConnectSourceAction,
  type ConnectActionType,
  type ConnectSourceStatus,
} from "@/actions/connect"
import { addWorkspaceMemberAction } from "@/actions/workspace"
import { useConnect } from "@/components/connect/connect-store"

const sourceTemplates = {
  system: {
    title: "Conectar fonte",
    type: "ERP",
    status: "configured" as ConnectSourceStatus,
    icon: Database,
  },
  spreadsheet: {
    title: "Importar planilha",
    type: "Planilha",
    status: "configured" as ConnectSourceStatus,
    icon: FileSpreadsheet,
  },
  email: {
    title: "Conectar e-mail",
    type: "E-mail",
    status: "not_configured" as ConnectSourceStatus,
    icon: Mail,
  },
  whatsapp: {
    title: "Conectar WhatsApp",
    type: "WhatsApp",
    status: "not_configured" as ConnectSourceStatus,
    icon: MessageCircle,
  },
} as const

const sourceTypes = ["ERP", "CRM", "Planilha", "Banco de dados", "API", "WhatsApp", "E-mail", "Portal interno", "Outro"]
const sourceStatuses: Array<{ value: ConnectSourceStatus; label: string }> = [
  { value: "not_configured", label: "Nao configurado" },
  { value: "configured", label: "Configurado" },
  { value: "error", label: "Erro" },
  { value: "paused", label: "Pausado" },
]
const actionTypes: Array<{ value: ConnectActionType; label: string }> = [
  { value: "read", label: "Consultar" },
  { value: "create", label: "Criar" },
  { value: "update", label: "Atualizar" },
  { value: "delete", label: "Remover" },
  { value: "send", label: "Enviar" },
  { value: "import", label: "Importar" },
  { value: "export", label: "Exportar" },
  { value: "report", label: "Relatorio" },
  { value: "custom", label: "Personalizada" },
]

const fieldClassName =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-gray-300"

type SourceFormState = {
  name: string
  sourceType: string
  status: ConnectSourceStatus
  accessUrl: string
  notes: string
}

type SectionFormState = {
  name: string
  description: string
}

type ActionFormState = {
  name: string
  actionType: ConnectActionType
  notes: string
}

type TeamFormState = {
  email: string
  role: "owner" | "admin" | "member"
}

function defaultSourceForm(type: string, status: ConnectSourceStatus): SourceFormState {
  return {
    name: "",
    sourceType: type,
    status,
    accessUrl: "",
    notes: "",
  }
}

export function ConnectModals() {
  const {
    modal,
    closeModal,
    setMainSystem,
    refreshData,
    canManage,
    selectedSource,
    selectedAction,
    toast,
    mainSystem,
  } = useConnect()

  const [sourceForm, setSourceForm] = useState<SourceFormState>(defaultSourceForm("ERP", "configured"))
  const [sectionForm, setSectionForm] = useState<SectionFormState>({ name: "", description: "" })
  const [actionForm, setActionForm] = useState<ActionFormState>({ name: "", actionType: "read", notes: "" })
  const [teamForm, setTeamForm] = useState<TeamFormState>({ email: "", role: "member" })
  const [mainSystemForm, setMainSystemForm] = useState({ name: "", type: "Sistema", url: "", notes: "" })
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const template = modal?.type ? sourceTemplates[modal.type as keyof typeof sourceTemplates] : null

  const resetAndClose = () => {
    setError("")
    setIsSubmitting(false)
    closeModal()
  }

  const openSourceTemplate = useMemo(() => {
    if (!template) return null
    return template
  }, [template])

  useEffect(() => {
    if (!openSourceTemplate) return

    setSourceForm(defaultSourceForm(openSourceTemplate.type, openSourceTemplate.status))
    setError("")
  }, [openSourceTemplate])

  useEffect(() => {
    if (modal?.type !== "mainSystem") return

    setMainSystemForm({
      name: mainSystem?.name || "",
      type: mainSystem?.type || "Sistema",
      url: mainSystem?.url || "",
      notes: mainSystem?.notes || "",
    })
    setError("")
  }, [mainSystem, modal?.type])

  const syncSourceTemplate = () => {
    if (!openSourceTemplate) return
    setSourceForm((current) => ({
      ...current,
      sourceType: openSourceTemplate.type,
      status: openSourceTemplate.status,
    }))
  }

  const handleCreateSource = async () => {
    setIsSubmitting(true)
    setError("")
    const result = await createConnectSourceAction({
      name: sourceForm.name,
      sourceType: sourceForm.sourceType,
      status: sourceForm.status,
      accessUrl: sourceForm.accessUrl,
      config: sourceForm.notes.trim() ? { notes: sourceForm.notes.trim() } : {},
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await refreshData({ silent: true })
    toast("Fonte criada com sucesso.")
    setSourceForm(defaultSourceForm(openSourceTemplate?.type ?? "ERP", openSourceTemplate?.status ?? "configured"))
    resetAndClose()
  }

  const handleCreateSection = async () => {
    if (!selectedSource) {
      setError("Escolha uma fonte para criar a sessao.")
      return
    }
    setIsSubmitting(true)
    setError("")
    const result = await createConnectSectionAction({
      sourceId: selectedSource.id,
      name: sectionForm.name,
      description: sectionForm.description,
      config: {},
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await refreshData({ silent: true })
    toast("Sessao criada com sucesso.")
    setSectionForm({ name: "", description: "" })
    resetAndClose()
  }

  const handleCreateAction = async () => {
    if (!selectedSource) {
      setError("Escolha uma fonte para criar a acao.")
      return
    }
    setIsSubmitting(true)
    setError("")
    const result = await createConnectActionAction({
      sourceId: selectedSource.id,
      name: actionForm.name,
      actionType: actionForm.actionType,
      config: actionForm.notes.trim() ? { notes: actionForm.notes.trim() } : {},
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await refreshData({ silent: true })
    toast("Acao criada com sucesso.")
    setActionForm({ name: "", actionType: "read", notes: "" })
    resetAndClose()
  }

  const handleDeleteSource = async () => {
    if (!selectedSource) {
      setError("Escolha uma fonte para remover.")
      return
    }

    setIsSubmitting(true)
    setError("")
    const result = await deleteConnectSourceAction({
      sourceId: selectedSource.id,
    })
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await refreshData({ silent: true })
    toast("Fonte removida com sucesso.")
    resetAndClose()
  }

  const handleInviteMember = async () => {
    setIsSubmitting(true)
    setError("")
    const result = await addWorkspaceMemberAction({
      email: teamForm.email,
      role: teamForm.role,
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    toast("Membro adicionado ao workspace.")
    setTeamForm({ email: "", role: "member" })
    resetAndClose()
  }

  const handleSaveMainSystem = async () => {
    setIsSubmitting(true)
    setError("")
    const result = await setMainSystem({
      name: mainSystemForm.name,
      type: mainSystemForm.type,
      url: mainSystemForm.url,
      notes: mainSystemForm.notes,
    })
    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    toast("Sistema principal salvo com sucesso.")
    resetAndClose()
  }

  const renderBody = () => {
    if (!modal?.type) return null

    if (modal.type in sourceTemplates) {
      const currentTemplate = sourceTemplates[modal.type as keyof typeof sourceTemplates]
      return (
        <>
          <ModalHeader
            title={currentTemplate.title}
            onClose={resetAndClose}
            icon={currentTemplate.icon}
          />
          <div className="space-y-4">
            <InfoCard text="Nesta etapa, a fonte sera salva de forma real no Connect, mas a integracao operacional ainda sera ativada depois." />
            <Field label="Nome da fonte">
              <input
                type="text"
                value={sourceForm.name}
                onFocus={syncSourceTemplate}
                onChange={(event) => setSourceForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Planilha Comercial"
                className={fieldClassName}
              />
            </Field>
            <Field label="Tipo de fonte">
              <select
                value={sourceForm.sourceType}
                onChange={(event) => setSourceForm((current) => ({ ...current, sourceType: event.target.value }))}
                className={fieldClassName}
              >
                {sourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status inicial">
              <select
                value={sourceForm.status}
                onChange={(event) =>
                  setSourceForm((current) => ({
                    ...current,
                    status: event.target.value as ConnectSourceStatus,
                  }))
                }
                className={fieldClassName}
              >
                {sourceStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL de acesso">
              <input
                type="text"
                value={sourceForm.accessUrl}
                onChange={(event) => setSourceForm((current) => ({ ...current, accessUrl: event.target.value }))}
                placeholder="https://..."
                className={fieldClassName}
              />
            </Field>
            <Field label="Observacoes">
              <textarea
                value={sourceForm.notes}
                onChange={(event) => setSourceForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Opcional"
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleCreateSource}
              confirmLabel={isSubmitting ? "Salvando..." : "Salvar fonte"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "section") {
      return (
        <>
          <ModalHeader title="Criar sessao" onClose={resetAndClose} icon={Plus} />
          <div className="space-y-4">
            <InfoCard text={selectedSource ? `Fonte selecionada: ${selectedSource.name}` : "Escolha uma fonte antes de criar a sessao."} />
            <Field label="Nome da sessao">
              <input
                type="text"
                value={sectionForm.name}
                onChange={(event) => setSectionForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Clientes"
                className={fieldClassName}
              />
            </Field>
            <Field label="Descricao">
              <textarea
                value={sectionForm.description}
                onChange={(event) => setSectionForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Explique o contexto desta sessao."
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleCreateSection}
              confirmLabel={isSubmitting ? "Salvando..." : "Criar sessao"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "action") {
      return (
        <>
          <ModalHeader title="Criar acao" onClose={resetAndClose} icon={Wrench} />
          <div className="space-y-4">
            <InfoCard text={selectedSource ? `Fonte selecionada: ${selectedSource.name}` : "Escolha uma fonte antes de criar a acao."} />
            <Field label="Nome da acao">
              <input
                type="text"
                value={actionForm.name}
                onChange={(event) => setActionForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Consultar cliente"
                className={fieldClassName}
              />
            </Field>
            <Field label="Tipo de acao">
              <select
                value={actionForm.actionType}
                onChange={(event) =>
                  setActionForm((current) => ({
                    ...current,
                    actionType: event.target.value as ConnectActionType,
                  }))
                }
                className={fieldClassName}
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observacoes">
              <textarea
                value={actionForm.notes}
                onChange={(event) => setActionForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Descreva quando esta acao deve ser usada."
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleCreateAction}
              confirmLabel={isSubmitting ? "Salvando..." : "Criar acao"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "configuredAction") {
      return (
        <>
          <ModalHeader title={selectedAction?.name || "Acao configurada"} onClose={resetAndClose} icon={Wrench} />
          <div className="space-y-4">
            <InfoCard text="Esta acao esta configurada, mas a execucao real sera conectada quando a fonte estiver integrada." />
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <span>Tipo de acao</span>
                <span className="font-medium text-[#0a0a0a]">{selectedAction?.actionType || "custom"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
            >
              Entendi
            </button>
          </div>
        </>
      )
    }

    if (modal.type === "deleteSource") {
      return (
        <>
          <ModalHeader title="Remover fonte" onClose={resetAndClose} icon={Database} />
          <div className="space-y-4">
            <InfoCard text={`Fonte selecionada: ${selectedSource?.name || "Fonte nao encontrada."}`} />
            <p className="text-sm leading-relaxed text-gray-500">
              Tem certeza que deseja remover esta fonte? As sessoes e acoes vinculadas tambem serao removidas.
            </p>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleDeleteSource}
              confirmLabel={isSubmitting ? "Removendo..." : "Remover fonte"}
              disabled={isSubmitting || !selectedSource}
            />
          </div>
        </>
      )
    }

    if (modal.type === "mainSystem") {
      return (
        <>
          <ModalHeader title="Configurar sistema principal" onClose={resetAndClose} icon={Settings2} />
          <div className="space-y-4">
            <Field label="Nome do sistema">
              <input
                type="text"
                value={mainSystemForm.name}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: ERP Interno"
                className={fieldClassName}
              />
            </Field>
            <Field label="Tipo">
              <input
                type="text"
                value={mainSystemForm.type}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, type: event.target.value }))}
                placeholder="Sistema"
                className={fieldClassName}
              />
            </Field>
            <Field label="URL">
              <input
                type="text"
                value={mainSystemForm.url}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://..."
                className={fieldClassName}
              />
            </Field>
            <Field label="Observacoes">
              <textarea
                value={mainSystemForm.notes}
                onChange={(event) => setMainSystemForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Opcional"
                className={`${fieldClassName} resize-none`}
              />
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleSaveMainSystem}
              confirmLabel={isSubmitting ? "Salvando..." : "Salvar sistema"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "equipe") {
      return (
        <>
          <ModalHeader title="Equipe" onClose={resetAndClose} icon={Users} />
          <div className="space-y-4">
            <InfoCard text="Convites por e-mail serao ativados posteriormente. Se o usuario ja existir, ele podera ser vinculado ao workspace agora." />
            <Field label="E-mail">
              <input
                type="email"
                value={teamForm.email}
                onChange={(event) => setTeamForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="membro@empresa.com"
                className={fieldClassName}
              />
            </Field>
            <Field label="Papel">
              <select
                value={teamForm.role}
                onChange={(event) =>
                  setTeamForm((current) => ({
                    ...current,
                    role: event.target.value as TeamFormState["role"],
                  }))
                }
                className={fieldClassName}
              >
                <option value="owner">Proprietario</option>
                <option value="admin">Admin</option>
                <option value="member">Membro</option>
              </select>
            </Field>
            {error && <ErrorCard text={error} />}
            <ModalActions
              onCancel={resetAndClose}
              onConfirm={handleInviteMember}
              confirmLabel={isSubmitting ? "Enviando..." : "Adicionar membro"}
              disabled={isSubmitting}
            />
          </div>
        </>
      )
    }

    if (modal.type === "arquivo" || modal.type === "foto") {
      const Icon = modal.type === "arquivo" ? Paperclip : Camera
      return (
        <>
          <ModalHeader title={modal.type === "arquivo" ? "Arquivo" : "Foto"} onClose={resetAndClose} icon={Icon} />
          <div className="space-y-4">
            <InfoCard
              text={
                modal.type === "arquivo"
                  ? "O envio real de arquivos sera habilitado quando a integracao da fonte estiver ativa."
                  : "O envio real de fotos sera habilitado quando a integracao da fonte estiver ativa."
              }
            />
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
            >
              Entendi
            </button>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <AnimatePresence>
      {modal?.type && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={resetAndClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-[90] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
          >
            {renderBody()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ModalHeader({
  title,
  onClose,
  icon: Icon,
}: {
  title: string
  onClose: () => void
  icon: typeof Database
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
      </div>
      <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
        <X className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  )
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirmLabel}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}

function InfoCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-sm leading-relaxed text-gray-500">{text}</p>
    </div>
  )
}

function ErrorCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-sm leading-relaxed text-red-700">{text}</p>
    </div>
  )
}
