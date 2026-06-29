"use client"

import { useEffect, useState, createContext, useContext, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  MessageSquare,
  Clock,
  User,
  Plus,
  Search,
  UserPlus,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  Users,
  Paperclip,
  Camera,
  FileEdit,
  CheckSquare,
  BarChart3,
  ClipboardList,
  Megaphone,
  Link2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Headphones,
  UsersRound,
  Upload,
  LifeBuoy,
  TrendingUp,
  FolderOpen,
  Video,
  Settings,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { HeaderActions } from "@/components/app/header-actions"
import { OperationsDashboardProvider, useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { AppInteractionsProvider } from "@/components/app/app-interactions"
import { useAuth } from "@/components/auth/auth-provider"
import { ProtectedRouteGuard } from "@/components/auth/auth-route-guard"
import { SupportProvider, useSupport } from "@/components/support/support-context"
import { Toaster } from "@/components/ui/toaster"

type MenuLevel = "main" | "more" | "equipe" | "foto"

const FABContext = createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  level: MenuLevel
  setLevel: (level: MenuLevel) => void
}>({
  isOpen: false,
  setIsOpen: () => {},
  level: "main",
  setLevel: () => {},
})

export const useFAB = () => useContext(FABContext)

type SessionItem = {
  icon: typeof Users
  label: string
  time: string
  count: number
  color: string
  bg: string
  href: string
}

const sessions = [
  { icon: Users, label: "Clientes", time: "Em preparação", count: 0, color: "#ec4899", bg: "#fce7f3" },
  { icon: Briefcase, label: "Viagens", time: "Em preparação", count: 0, color: "#8b5cf6", bg: "#ede9fe" },
  { icon: TrendingUp, label: "Cotações", time: "Em preparação", count: 0, color: "#3b82f6", bg: "#dbeafe" },
  { icon: FileText, label: "Contratos", time: "Em preparação", count: 0, color: "#ef4444", bg: "#fee2e2" },
  { icon: Calendar, label: "Reservas", time: "Em preparação", count: 0, color: "#0ea5e9", bg: "#e0f2fe" },
  { icon: DollarSign, label: "Financeiro", time: "Em preparação", count: 0, color: "#22c55e", bg: "#dcfce7" },
  { icon: FolderOpen, label: "Documentos", time: "Em preparação", count: 0, color: "#f97316", bg: "#ffedd5" },
  { icon: UsersRound, label: "Fornecedores", time: "Em preparação", count: 0, color: "#0ea5e9", bg: "#e0f2fe" },
  { icon: Video, label: "Agenda", time: "Em preparação", count: 0, color: "#ef4444", bg: "#fee2e2" },
  { icon: BarChart3, label: "Relatórios", time: "Em preparação", count: 0, color: "#f97316", bg: "#ffedd5" },
  { icon: Link2, label: "Integrações", time: "Em preparação", count: 0, color: "#6b7280", bg: "#f3f4f6" },
  { icon: Settings, label: "Configurações", time: "Em preparação", count: 0, color: "#6b7280", bg: "#f3f4f6" },
]

function ActionSheetMenu() {
  const { isOpen, setIsOpen, level, setLevel } = useFAB()
  const { openSupport } = useSupport()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const close = () => {
    setIsOpen(false)
    setLevel("main")
  }

  const mainActions = [
    { icon: UserPlus, label: "Cliente", href: "/app/novo/cliente", color: "#3b82f6", bg: "#dbeafe" },
    { icon: Briefcase, label: "Viagem", href: "/app/novo/operacao", color: "#8b5cf6", bg: "#ede9fe" },
    { icon: TrendingUp, label: "Cotação", href: "/app/novo/cotacao", color: "#3b82f6", bg: "#dbeafe" },
    { icon: FileText, label: "Contrato", href: "/app/novo/contrato", color: "#ef4444", bg: "#fee2e2" },
    { icon: Calendar, label: "Reserva", href: "/app/novo/reserva", color: "#0ea5e9", bg: "#e0f2fe" },
    { icon: DollarSign, label: "Financeiro", href: "/app/novo/financeiro", color: "#22c55e", bg: "#dcfce7" },
    { icon: FileEdit, label: "Documento", href: "/app/novo/documento", color: "#f97316", bg: "#ffedd5" },
    { icon: UsersRound, label: "Fornecedor", href: "/app/novo/fornecedor", color: "#0ea5e9", bg: "#e0f2fe" },
    { icon: LifeBuoy, label: "Atendimento", href: "/app/conversas/suporte", color: "#6b7280", bg: "#f3f4f6" },
  ]

  const moreActions = [
    { icon: FileEdit, label: "Documento", href: "/app/novo/documento", color: "#3b82f6", bg: "#dbeafe" },
    { icon: CheckSquare, label: "Tarefa", href: "/app/novo/tarefa", color: "#22c55e", bg: "#dcfce7" },
    { icon: BarChart3, label: "Relatório", href: "/app/novo/relatorio", color: "#f97316", bg: "#ffedd5" },
    { icon: ClipboardList, label: "Formulário", href: "/app/novo/formulario", color: "#8b5cf6", bg: "#ede9fe" },
    { icon: Megaphone, label: "Marketing", href: "/app/novo/marketing", color: "#ec4899", bg: "#fce7f3" },
    { icon: Link2, label: "Integração", href: "/app/novo/integracao", color: "#0ea5e9", bg: "#e0f2fe" },
    { icon: LifeBuoy, label: "Atendimento", onClick: () => { close(); openSupport() }, color: "#6b7280", bg: "#f3f4f6" },
  ]

  const equipeGroups = [
    { icon: Briefcase, label: "Comercial", href: "/app/equipe/comercial", color: "#f97316", bg: "#ffedd5" },
    { icon: UsersRound, label: "Operacional", href: "/app/equipe/operacional", color: "#8b5cf6", bg: "#ede9fe" },
    { icon: DollarSign, label: "Financeiro", href: "/app/equipe/financeiro", color: "#22c55e", bg: "#dcfce7" },
    { icon: Shield, label: "Administrativo", href: "/app/equipe/administrativo", color: "#6b7280", bg: "#f3f4f6" },
    { icon: Headphones, label: "Gestão", href: "/app/equipe/gestao", color: "#0ea5e9", bg: "#e0f2fe" },
  ]

  const fotoOptions = [
    { icon: Camera, label: "Tirar foto", description: "Use a câmera do dispositivo", color: "#ec4899", bg: "#fce7f3", onClick: () => cameraInputRef.current?.click() },
    { icon: Upload, label: "Upload de imagem", description: "Selecione da galeria ou arquivos", color: "#3b82f6", bg: "#dbeafe", onClick: () => uploadInputRef.current?.click() },
  ]

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      close()
    }
  }

  const titles: Record<MenuLevel, string> = {
    main: "Criar novo",
    more: "Mais ações",
    equipe: "Fornecedores",
    foto: "Adicionar foto",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:flex lg:items-center lg:justify-center"
            onClick={close}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 lg:inset-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-0 lg:pointer-events-none"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl lg:w-full lg:max-w-md lg:pointer-events-auto">
              <div className="flex items-center justify-center relative px-4 py-3 border-b border-gray-100">
                {level !== "main" && (
                  <button onClick={() => setLevel("main")} className="absolute left-3 flex items-center gap-1 text-sm text-gray-500">
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                )}
                <span className="text-sm font-semibold text-[#0a0a0a]">{titles[level]}</span>
              </div>

              {level === "main" && (
                <div className="p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {mainActions.map((action) => (
                      <Link
                        key={action.label}
                        href={action.href}
                        onClick={close}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                          <action.icon className="w-5 h-5" style={{ color: action.color }} />
                        </span>
                        <span className="text-xs font-medium text-gray-700">{action.label}</span>
                      </Link>
                    ))}
                  </div>

                </div>
              )}

              {level === "more" && (
                <div className="p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {moreActions.map((action) =>
                      action.href ? (
                        <Link
                          key={action.label}
                          href={action.href}
                          onClick={close}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                            <action.icon className="w-5 h-5" style={{ color: action.color }} />
                          </span>
                          <span className="text-xs font-medium text-gray-700">{action.label}</span>
                        </Link>
                      ) : (
                        <button
                          key={action.label}
                          onClick={action.onClick}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                            <action.icon className="w-5 h-5" style={{ color: action.color }} />
                          </span>
                          <span className="text-xs font-medium text-gray-700">{action.label}</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {level === "equipe" && (
                <div className="p-2 max-h-[50vh] overflow-y-auto">
                  {equipeGroups.map((group) => (
                    <Link
                      key={group.label}
                      href={group.href}
                      onClick={close}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: group.bg }}>
                        <group.icon className="w-4 h-4" style={{ color: group.color }} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-[#0a0a0a]">{group.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                  ))}
                </div>
              )}

              {level === "foto" && (
                <div className="p-2">
                  {fotoOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={option.onClick}
                      className="flex items-center gap-3 p-3 w-full rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: option.bg }}>
                        <option.icon className="w-5 h-5" style={{ color: option.color }} />
                      </span>
                      <span className="flex-1 text-left">
                        <span className="block text-sm font-medium text-[#0a0a0a]">{option.label}</span>
                        <span className="block text-xs text-gray-500">{option.description}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={close} className="w-full mt-2 py-3.5 bg-white rounded-2xl text-center font-semibold text-gray-700 shadow-lg lg:hidden">
              Cancelar
            </button>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function BottomNav() {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useFAB()

  const navItems = [
    { icon: Home, label: "Início", href: "/app", exact: true },
    { icon: MessageSquare, label: "Conversas", href: "/app/conversas" },
    { icon: null, label: "", href: "" },
    { icon: Clock, label: "Histórico", href: "/app/historico" },
    { icon: User, label: "Perfil", href: "/app/voce" },
  ]

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30 lg:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {navItems.map((item, index) => {
          if (index === 2) {
            return (
              <button key="fab" onClick={() => setIsOpen(!isOpen)} className="relative -mt-5">
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="tp-gradient-chip flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
                  <Plus className="w-6 h-6 text-white" />
                </motion.div>
              </button>
            )
          }

          const Icon = item.icon!
          const active = isActive(item.href, item.exact)

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 min-w-[60px]">
              <Icon className={`w-5 h-5 ${active ? "text-[#0a0a0a]" : "text-gray-400"}`} fill={active && item.label === "Conversas" ? "currentColor" : "none"} />
              <span className={`text-[10px] ${active ? "text-[#0a0a0a] font-medium" : "text-gray-400"}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function GlobalHeader() {
  return (
    <header className="sticky top-0 bg-[#f5f5f3]/95 backdrop-blur-lg z-20 lg:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Image
            src="/travelpro-logo-horizontal.png"
            alt="TravelPro"
            width={140}
            height={38}
            priority
            className="h-8 w-auto object-contain"
          />
        </div>
        <HeaderActions variant="mobile" />
      </div>
    </header>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()
  const { setIsOpen, setLevel } = useFAB()
  const { summary } = useOperationsDashboard()
  const sessionsData: SessionItem[] = [
    {
      icon: Users,
      label: "Clientes",
      time: summary?.clientsCount === 1 ? "1 cliente" : (summary?.clientsCount ?? 0) > 1 ? `${summary?.clientsCount ?? 0} clientes` : "Sem registros",
      count: summary?.clientsCount ?? 0,
      color: "#ec4899",
      bg: "#fce7f3",
      href: "/app/conversas/cadastros",
    },
    {
      icon: Briefcase,
      label: "Viagens",
      time: summary?.operationsCount === 1 ? "1 viagem" : (summary?.operationsCount ?? 0) > 1 ? `${summary?.operationsCount ?? 0} viagens` : "Sem registros",
      count: summary?.operationsCount ?? 0,
      color: "#8b5cf6",
      bg: "#ede9fe",
      href: "/app/conversas/operacoes",
    },
    { icon: TrendingUp, label: "Cotações", time: "Chat contextual", count: 0, color: "#3b82f6", bg: "#dbeafe", href: "/app/conversas/vendas" },
    { icon: FileText, label: "Contratos", time: "Documentos de viagem", count: 0, color: "#ef4444", bg: "#fee2e2", href: "/app/conversas/documentos/contratos" },
    { icon: Calendar, label: "Reservas", time: "Chat contextual", count: 0, color: "#0ea5e9", bg: "#e0f2fe", href: "/app/conversas/operacoes/reservas" },
    {
      icon: DollarSign,
      label: "Financeiro",
      time: summary?.financial.entriesCount === 1 ? "1 lançamento" : (summary?.financial.entriesCount ?? 0) > 1 ? `${summary?.financial.entriesCount ?? 0} lançamentos` : "Sem registros",
      count: summary?.financial.entriesCount ?? 0,
      color: "#22c55e",
      bg: "#dcfce7",
      href: "/app/conversas/financeiro",
    },
    {
      icon: FolderOpen,
      label: "Documentos",
      time: summary?.documentsCount === 1 ? "1 documento" : (summary?.documentsCount ?? 0) > 1 ? `${summary?.documentsCount ?? 0} documentos` : "Sem registros",
      count: summary?.documentsCount ?? 0,
      color: "#f97316",
      bg: "#ffedd5",
      href: "/app/conversas/documentos",
    },
    { icon: UsersRound, label: "Fornecedores", time: "Parceiros e operadoras", count: 0, color: "#0ea5e9", bg: "#e0f2fe", href: "/app/conversas/cadastros/fornecedores" },
    {
      icon: Video,
      label: "Agenda",
      time: summary?.meetingsCount === 1 ? "1 atendimento" : (summary?.meetingsCount ?? 0) > 1 ? `${summary?.meetingsCount ?? 0} atendimentos` : "Sem registros",
      count: summary?.meetingsCount ?? 0,
      color: "#ef4444",
      bg: "#fee2e2",
      href: "/app/conversas/reunioes",
    },
    { icon: BarChart3, label: "Relatórios", time: "Indicadores e análises", count: 0, color: "#f97316", bg: "#ffedd5", href: "/app/conversas/documentos/relatorios" },
    { icon: Link2, label: "Integrações", time: "Conexões externas", count: 0, color: "#6b7280", bg: "#f3f4f6", href: "/app/conversas/sistema/integracoes" },
    { icon: Settings, label: "Configurações", time: "Configurações e logs", count: 0, color: "#6b7280", bg: "#f3f4f6", href: "/app/conversas/sistema" },
  ]

  const navItems = [
    { icon: Home, label: "Início", href: "/app", exact: true },
    { icon: MessageSquare, label: "Conversas", href: "/app/conversas" },
    { icon: Clock, label: "Histórico", href: "/app/historico" },
    { icon: User, label: "Perfil", href: "/app/voce" },
  ]

  const favoriteItems = [
    { icon: TrendingUp, label: "Roteiros", href: "/app/conversas/vendas/roteiros", color: "#3b82f6", bg: "#dbeafe" },
    { icon: LifeBuoy, label: "Atendimentos", href: "/app/conversas/cadastros/atendimentos", color: "#6b7280", bg: "#f3f4f6" },
  ]

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <aside className="hidden lg:flex lg:flex-col w-[280px] flex-shrink-0 border-r border-gray-200 bg-white h-screen">
      <div className="px-5 h-16 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
        <Image
            src="/travelpro-logo-horizontal.png"
          alt="TravelPro"
          width={140}
          height={38}
          priority
          className="h-8 w-auto object-contain"
        />
        <HeaderActions variant="desktop" />
      </div>

      <div className="p-3 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-300" />
        </div>
        <button
          onClick={() => {
            setLevel("main")
            setIsOpen(true)
          }}
          className="tp-gradient-btn flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sessões</span>
        </div>
        {sessionsData.map((s) => (
          <Link key={s.label} href={s.href} className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-[#0a0a0a] truncate">{s.label}</span>
              <span className="block text-xs text-gray-400">{s.time}</span>
            </span>
            {s.count > 0 && (
              <span className="w-5 h-5 bg-blue-500 text-white text-[11px] rounded-full flex items-center justify-center flex-shrink-0">
                {s.count}
              </span>
            )}
          </Link>
        ))}
        <div className="px-2 pb-2 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Favoritos</span>
        </div>
        {favoriteItems.map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.bg }}>
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-[#0a0a0a] truncate">{item.label}</span>
              <span className="block text-xs text-gray-400">Acesso rápido</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="border-t border-gray-100 p-2 flex-shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${active ? "bg-gray-100 text-[#0a0a0a]" : "text-gray-400 hover:bg-gray-50"}`}>
                <item.icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

function DesktopContextPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const { summary, isLoading } = useOperationsDashboard()
  const financialSummary = summary?.financial ?? null
  const activities =
    summary?.activities.map((log) => ({
      id: log.id,
      dot:
        log.area === "financial"
          ? "#22c55e"
          : log.area === "meetings"
            ? "#ef4444"
            : log.area === "support"
              ? "#6b7280"
              : "#3b82f6",
      text: log.description,
      time: formatContextTimestamp(log.createdAt),
    })) ?? []

  const previousBalance = financialSummary ? financialSummary.balance - financialSummary.monthBalance : 0

  const financeiro = [
    { label: "Saldo final", value: financialSummary ? formatCurrency(financialSummary.balance) : null, accent: true },
    { label: "Ganhos", value: financialSummary ? `+ ${formatCurrency(financialSummary.totalIncome)}` : null, color: "text-green-600" },
    { label: "Gastos", value: financialSummary ? `- ${formatCurrency(financialSummary.totalExpense)}` : null, color: "text-red-600" },
    { label: "Saldo anterior", value: financialSummary ? formatCurrency(previousBalance) : null, color: "text-gray-600" },
  ]

  if (collapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center w-12 flex-shrink-0 border-l border-gray-200 bg-white pt-4">
        <button onClick={() => setCollapsed(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" aria-label="Expandir contexto">
          <PanelRightOpen className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-[300px] flex-shrink-0 border-l border-gray-200 bg-white h-screen">
      <div className="px-4 h-16 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
        <span className="text-sm font-semibold text-[#0a0a0a]">Contexto</span>
        <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400" aria-label="Recolher contexto">
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-[#0a0a0a]">Financeiro</span>
          </div>
          <div className="space-y-2">
            {isLoading && !financialSummary ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <span className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                  <span className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              ))
            ) : (
              financeiro.map((f) => (
                <div key={f.label} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${f.accent ? "tp-gradient-chip" : "bg-gray-50"}`}>
                  <span className={`text-xs ${f.accent ? "text-gray-300" : "text-gray-500"}`}>{f.label}</span>
                  <span className={`text-sm font-semibold ${f.accent ? "text-white" : f.color ?? "text-[#0a0a0a]"}`}>{f.value ?? "R$ 0,00"}</span>
                </div>
              ))
            )}
          </div>
          {financialSummary && (
            <p className="mt-2 text-xs text-gray-400">{financialSummary.entriesCount} lancamentos financeiros no workspace.</p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-[#0a0a0a]">Atividades recentes</span>
          </div>
          {isLoading && activities.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum registro ainda.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: a.dot }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                    <span className="text-xs text-gray-400">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function formatContextTimestamp(value: string | null) {
  if (!value) {
    return "Agora"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [level, setLevel] = useState<MenuLevel>("main")

  return (
    <FABContext.Provider value={{ isOpen, setIsOpen, level, setLevel }}>
      <div className="min-h-screen bg-[#f5f5f3] lg:flex lg:h-screen lg:overflow-hidden">
        <DesktopSidebar />
        <div className="flex flex-col flex-1 min-w-0 lg:h-screen lg:overflow-hidden">
          <GlobalHeader />
          <main className="pb-20 lg:pb-0 lg:flex-1 lg:overflow-y-auto">{children}</main>
          <BottomNav />
        </div>
        <DesktopContextPanel />
        <ActionSheetMenu />
      </div>
    </FABContext.Provider>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { workspace } = useAuth()

  return (
    <ProtectedRouteGuard>
      <SupportProvider>
        <AppInteractionsProvider>
          <OperationsDashboardProvider workspaceId={workspace?.id}>
            <AppShell>{children}</AppShell>
            <Toaster />
          </OperationsDashboardProvider>
        </AppInteractionsProvider>
      </SupportProvider>
    </ProtectedRouteGuard>
  )
}
