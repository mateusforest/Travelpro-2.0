"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  SlidersHorizontal,
  Building2,
  Users,
  CreditCard,
  Receipt,
  FileText,
  ShieldCheck,
  UserPlus,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import {
  addWorkspaceMemberAction,
  getWorkspaceMembersAction,
  updateWorkspaceDetailsAction,
} from "@/actions/workspace"

type FilterState = {
  period: string
  type: string
  status: string
  owner: string
  area: string
}

type CompanyState = {
  companyName: string
  segment: string
  cnpj: string
  phone: string
  email: string
  site: string
  address: string
}

type InviteState = {
  name: string
  email: string
  password: string
  role: "owner" | "admin" | "member"
}

type WorkspaceMember = {
  userId: string
  role: string
  fullName: string
  email: string
}

type PaymentState = {
  cardName: string
  cardLast4: string
  expiry: string
  billingDocument: string
}

type AppModal =
  | "filters"
  | "company"
  | "team"
  | "subscription"
  | "billingHistory"
  | "invoices"
  | "payment"
  | null

type AppInteractionsContextValue = {
  openFilters: () => void
  openCompany: () => void
  openTeam: () => void
  openSubscription: () => void
  openBillingHistory: () => void
  openInvoices: () => void
  openPayment: () => void
  closeModal: () => void
}

const AppInteractionsContext = createContext<AppInteractionsContextValue | null>(null)

const defaultFilters: FilterState = {
  period: "Hoje",
  type: "Clientes",
  status: "Todos",
  owner: "Todos",
  area: "Todas as áreas",
}

const defaultCompany: CompanyState = {
  companyName: "",
  segment: "",
  cnpj: "",
  phone: "",
  email: "",
  site: "",
  address: "",
}

const defaultInvite: InviteState = {
  name: "",
  email: "",
  password: "",
  role: "member",
}

const defaultPayment: PaymentState = {
  cardName: "",
  cardLast4: "",
  expiry: "",
  billingDocument: "",
}

function formatRole(role: string) {
  if (role === "owner") return "Proprietário"
  if (role === "admin") return "Admin"
  return "Membro"
}

export function useAppInteractions() {
  const context = useContext(AppInteractionsContext)
  if (!context) {
    throw new Error("useAppInteractions deve ser usado dentro de AppInteractionsProvider")
  }
  return context
}

export function AppInteractionsProvider({ children }: { children: ReactNode }) {
  const { workspace, canManageWorkspace, refresh } = useAuth()
  const [modal, setModal] = useState<AppModal>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [company, setCompany] = useState<CompanyState>(defaultCompany)
  const [companyError, setCompanyError] = useState("")
  const [savingCompany, setSavingCompany] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState<InviteState>(defaultInvite)
  const [inviteError, setInviteError] = useState("")
  const [invitingMember, setInvitingMember] = useState(false)
  const [teamMembers, setTeamMembers] = useState<WorkspaceMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState("")
  const [payment, setPayment] = useState<PaymentState>(defaultPayment)

  useEffect(() => {
    if (modal !== "company") return

    setCompany({
      companyName: workspace?.name || "",
      segment: workspace?.metadata?.segment || "",
      cnpj: workspace?.metadata?.cnpj || "",
      phone: workspace?.metadata?.phone || "",
      email: workspace?.metadata?.email || "",
      site: workspace?.metadata?.site || "",
      address: workspace?.metadata?.address || "",
    })
    setCompanyError("")
  }, [modal, workspace])

  useEffect(() => {
    if (modal !== "team") return

    let active = true
    setTeamLoading(true)
    setTeamError("")

    void getWorkspaceMembersAction().then((result) => {
      if (!active) return

      if (result.error) {
        setTeamMembers([])
        setTeamError(result.error)
      } else {
        setTeamMembers(result.members ?? [])
        setTeamError("")
      }

      setTeamLoading(false)
    })

    return () => {
      active = false
    }
  }, [modal])

  const closeModal = () => {
    setModal(null)
    setInviteOpen(false)
    setInvite(defaultInvite)
    setInviteError("")
    setCompanyError("")
    setTeamError("")
  }

  const value = useMemo<AppInteractionsContextValue>(
    () => ({
      openFilters: () => setModal("filters"),
      openCompany: () => setModal("company"),
      openTeam: () => setModal("team"),
      openSubscription: () => setModal("subscription"),
      openBillingHistory: () => setModal("billingHistory"),
      openInvoices: () => setModal("invoices"),
      openPayment: () => setModal("payment"),
      closeModal,
    }),
    [],
  )

  const applyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: "Filtros aplicados localmente. A busca real será conectada ao backend.",
    })
    closeModal()
  }

  const saveCompany = async () => {
    setSavingCompany(true)
    setCompanyError("")

    const result = await updateWorkspaceDetailsAction({
      name: company.companyName,
      segment: company.segment,
      cnpj: company.cnpj,
      phone: company.phone,
      email: company.email,
      site: company.site,
      address: company.address,
    })

    setSavingCompany(false)

    if (result.error) {
      setCompanyError(result.error)
      return
    }

    await refresh()
    toast({
      title: "Agência atualizada",
      description: "Os dados da agência foram salvos com sucesso.",
    })
    closeModal()
  }

  const createTeamMember = async () => {
    setInvitingMember(true)
    setInviteError("")

    const result = await addWorkspaceMemberAction({
      name: invite.name,
      email: invite.email,
      password: invite.password,
      role: invite.role,
    })

    setInvitingMember(false)

    if (result.error) {
      setInviteError(result.error)
      return
    }

    const membersResult = await getWorkspaceMembersAction()
    if (!membersResult.error) {
      setTeamMembers(membersResult.members ?? [])
    }

    toast({
      title: "Membro adicionado",
      description: "A conta foi criada e vinculada ao workspace com sucesso.",
    })
    setInvite(defaultInvite)
    setInviteOpen(false)
  }

  const showBillingToast = () => {
    toast({
      title: "Faturamento em preparação",
      description: "As notas fiscais serão exibidas após a integração de faturamento.",
    })
  }

  const showStripeToast = () => {
    toast({
      title: "Assinaturas em preparação",
      description: "Planos e assinaturas serão conectados ao Stripe posteriormente.",
    })
  }

  const showPaymentToast = () => {
    toast({
      title: "Checkout em preparação",
      description: "Checkout seguro será conectado posteriormente.",
    })
  }

  const showPermissionToast = () => {
    toast({
      title: "Acesso somente leitura",
      description: "Apenas owner, admin ou master podem editar esta área.",
    })
  }

  const hasOnlyOwner = teamMembers.length === 1

  return (
    <AppInteractionsContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[75] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-md lg:rounded-3xl"
            >
              {modal === "filters" && (
                <ModalShell icon={SlidersHorizontal} title="Filtros" onClose={closeModal}>
                  <div className="space-y-4">
                    <ChoiceField
                      label="Período"
                      value={filters.period}
                      onChange={(period) => setFilters((prev) => ({ ...prev, period }))}
                      options={["Hoje", "Esta semana", "Este mês", "Personalizado"]}
                    />
                    <ChoiceField
                      label="Tipo"
                      value={filters.type}
                      onChange={(type) => setFilters((prev) => ({ ...prev, type }))}
                      options={["Clientes", "Operações", "Financeiro", "Equipe", "Documentos", "Reuniões", "Suporte"]}
                    />
                    <ChoiceField
                      label="Status"
                      value={filters.status}
                      onChange={(status) => setFilters((prev) => ({ ...prev, status }))}
                      options={["Todos", "Aberto", "Em andamento", "Concluído", "Em preparação"]}
                    />
                    <InputField label="Responsável" value={filters.owner} onChange={(owner) => setFilters((prev) => ({ ...prev, owner }))} placeholder="Todos" />
                    <InputField label="Área" value={filters.area} onChange={(area) => setFilters((prev) => ({ ...prev, area }))} placeholder="Todas as áreas" />
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => setFilters(defaultFilters)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Limpar filtros
                      </button>
                      <button type="button" onClick={applyFilters} className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "company" && (
                <ModalShell icon={Building2} title="Minha agência" onClose={closeModal}>
                  <div className="space-y-4">
                    {!workspace?.name && !company.segment && !company.cnpj && <EmptyHint text="Sem dados cadastrados ainda." />}
                    {!canManageWorkspace && (
                      <EmptyHint text="Você pode visualizar os dados da agência, mas apenas owner, admin ou master podem editar." />
                    )}
                    <InputField
                      label="Nome da agência"
                      value={company.companyName}
                      onChange={(companyName) => setCompany((prev) => ({ ...prev, companyName }))}
                      placeholder="Nome da agência"
                      disabled={!canManageWorkspace}
                    />
                    <InputField
                      label="Segmento"
                      value={company.segment}
                      onChange={(segment) => setCompany((prev) => ({ ...prev, segment }))}
                      placeholder="Segmento"
                      disabled={!canManageWorkspace}
                    />
                    <InputField
                      label="CNPJ"
                      value={company.cnpj}
                      onChange={(cnpj) => setCompany((prev) => ({ ...prev, cnpj }))}
                      placeholder="CNPJ"
                      disabled={!canManageWorkspace}
                    />
                    <InputField
                      label="Telefone"
                      value={company.phone}
                      onChange={(phone) => setCompany((prev) => ({ ...prev, phone }))}
                      placeholder="Telefone"
                      disabled={!canManageWorkspace}
                    />
                    <InputField
                      label="E-mail"
                      value={company.email}
                      onChange={(email) => setCompany((prev) => ({ ...prev, email }))}
                      placeholder="E-mail"
                      disabled={!canManageWorkspace}
                    />
                    <InputField
                      label="Site"
                      value={company.site}
                      onChange={(site) => setCompany((prev) => ({ ...prev, site }))}
                      placeholder="Site"
                      disabled={!canManageWorkspace}
                    />
                    <TextareaField
                      label="Endereço"
                      value={company.address}
                      onChange={(address) => setCompany((prev) => ({ ...prev, address }))}
                      placeholder="Endereço"
                      disabled={!canManageWorkspace}
                    />
                    {companyError && <InlineMessage tone="error" text={companyError} />}
                    <ModalActions
                      secondaryLabel="Cancelar"
                      primaryLabel={savingCompany ? "Salvando..." : "Salvar"}
                      onSecondary={closeModal}
                      onPrimary={canManageWorkspace ? saveCompany : showPermissionToast}
                      primaryDisabled={savingCompany}
                    />
                  </div>
                </ModalShell>
              )}

              {modal === "team" && (
                <ModalShell icon={Users} title="Equipe" onClose={closeModal}>
                  <div className="space-y-4">
                    {teamLoading ? (
                      <EmptyHint text="Carregando equipe..." />
                    ) : (
                      <>
                        {teamMembers.length === 0 ? (
                          <EmptyHint text="Nenhum usuário cadastrado ainda." />
                        ) : (
                          <div className="overflow-hidden rounded-2xl border border-gray-100">
                            {teamMembers.map((member) => (
                              <div key={member.userId} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                                  {member.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-[#0a0a0a]">{member.fullName}</p>
                                  <p className="truncate text-xs text-gray-500">{member.email}</p>
                                </div>
                                <span className="text-xs font-medium text-gray-400">{formatRole(member.role)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {hasOnlyOwner && <EmptyHint text="Nenhum outro membro cadastrado ainda." />}
                      </>
                    )}

                    {teamError && <InlineMessage tone="error" text={teamError} />}
                    {!canManageWorkspace && (
                      <EmptyHint text="Você pode visualizar a equipe, mas apenas owner, admin ou master podem editar membros e permissões." />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => (canManageWorkspace ? setInviteOpen((prev) => !prev) : showPermissionToast())}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
                      >
                        <UserPlus className="h-4 w-4" />
                        Novo membro
                      </button>
                      <button
                        type="button"
                        onClick={canManageWorkspace
                          ? () =>
                              toast({
                                title: "Permissões preparadas",
                                description: "A gestão de papéis já usa os dados reais do workspace e receberá fluxos avançados depois.",
                              })
                          : showPermissionToast}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Gerenciar permissões
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {inviteOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <InputField
                              label="Nome"
                              value={invite.name}
                              onChange={(name) => setInvite((prev) => ({ ...prev, name }))}
                              placeholder="Nome"
                            />
                            <InputField
                              label="E-mail"
                              value={invite.email}
                              onChange={(email) => setInvite((prev) => ({ ...prev, email }))}
                              placeholder="E-mail"
                            />
                            <InputField
                              label="Senha"
                              type="password"
                              value={invite.password}
                              onChange={(password) => setInvite((prev) => ({ ...prev, password }))}
                              placeholder="Senha"
                            />
                            <ChoiceField
                              label="Papel"
                              value={formatRole(invite.role)}
                              onChange={(roleLabel) =>
                                setInvite((prev) => ({
                                  ...prev,
                                  role:
                                    roleLabel === "Proprietário"
                                      ? "owner"
                                      : roleLabel === "Admin"
                                        ? "admin"
                                        : "member",
                                }))
                              }
                              options={["Proprietário", "Admin", "Membro"]}
                            />
                            {inviteError && <InlineMessage tone="error" text={inviteError} />}
                            <button
                              type="button"
                              onClick={createTeamMember}
                              disabled={invitingMember || !invite.name.trim() || !invite.email.trim() || !invite.password.trim()}
                              className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {invitingMember ? "Criando..." : "Criar membro"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ModalShell>
              )}

              {modal === "subscription" && (
                <ModalShell icon={CreditCard} title="Assinatura e plano" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhuma assinatura ativa ainda." />
                    <InfoRow label="Plano atual" value="—" />
                    <InfoRow label="Usuários incluídos" value="0" />
                    <InfoRow label="Créditos IA" value="0" />
                    <InfoRow label="Armazenamento" value="0 GB" />
                    <InfoRow label="Status da assinatura" value="Em preparação" />
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm leading-relaxed text-gray-500">
                        Planos e assinaturas serão conectados ao Stripe posteriormente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={showStripeToast} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                        Ver planos
                      </button>
                      <button type="button" onClick={showStripeToast} className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                        Alterar plano
                      </button>
                    </div>
                  </div>
                </ModalShell>
              )}

              {modal === "billingHistory" && (
                <ModalShell icon={Receipt} title="Histórico de cobrança" onClose={closeModal}>
                  <div className="space-y-4">
                    <TableCard headers={["Data", "Descrição", "Valor", "Status"]} emptyLabel="Nenhuma cobrança registrada ainda." />
                  </div>
                </ModalShell>
              )}

              {modal === "invoices" && (
                <ModalShell icon={FileText} title="Notas fiscais" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhuma nota fiscal disponível ainda." />
                    <button type="button" onClick={showBillingToast} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                      Atualizar notas fiscais
                    </button>
                  </div>
                </ModalShell>
              )}

              {modal === "payment" && (
                <ModalShell icon={CreditCard} title="Forma de pagamento" onClose={closeModal}>
                  <div className="space-y-4">
                    <EmptyHint text="Nenhuma forma de pagamento cadastrada ainda." />
                    <InputField label="Nome no cartão" value={payment.cardName} onChange={(cardName) => setPayment((prev) => ({ ...prev, cardName }))} placeholder="Nome no cartão" />
                    <InputField label="Final do cartão" value={payment.cardLast4} onChange={(cardLast4) => setPayment((prev) => ({ ...prev, cardLast4 }))} placeholder="Últimos 4 dígitos" />
                    <InputField label="Vencimento" value={payment.expiry} onChange={(expiry) => setPayment((prev) => ({ ...prev, expiry }))} placeholder="MM/AA" />
                    <InputField label="CPF/CNPJ de cobrança" value={payment.billingDocument} onChange={(billingDocument) => setPayment((prev) => ({ ...prev, billingDocument }))} placeholder="CPF ou CNPJ" />
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm leading-relaxed text-gray-500">
                        Os dados de pagamento reais serão gerenciados com segurança pelo Stripe.
                      </p>
                    </div>
                    <button type="button" onClick={showPaymentToast} className="w-full rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]">
                      Configurar pagamento
                    </button>
                  </div>
                </ModalShell>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppInteractionsContext.Provider>
  )
}

function ModalShell({
  icon: Icon,
  title,
  onClose,
  children,
}: {
  icon: typeof SlidersHorizontal
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <Icon className="h-5 w-5 text-gray-600" />
          </span>
          <h2 className="text-lg font-semibold text-[#0a0a0a]">{title}</h2>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-gray-100" aria-label="Fechar">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      {children}
    </>
  )
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:border-gray-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:border-gray-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  )
}

function ChoiceField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
              option === value ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function ModalActions({
  secondaryLabel,
  primaryLabel,
  onSecondary,
  onPrimary,
  primaryDisabled = false,
}: {
  secondaryLabel: string
  primaryLabel: string
  onSecondary: () => void
  onPrimary: () => void
  primaryDisabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button type="button" onClick={onSecondary} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
        {secondaryLabel}
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-sm leading-relaxed text-gray-500">{text}</p>
    </div>
  )
}

function InlineMessage({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tone === "error" ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
      {text}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#0a0a0a]">{value}</span>
    </div>
  )
}

function TableCard({ headers, emptyLabel }: { headers: string[]; emptyLabel: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100">
      <div className="grid grid-cols-4 gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        {headers.map((header) => (
          <span key={header} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {header}
          </span>
        ))}
      </div>
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      </div>
    </div>
  )
}
