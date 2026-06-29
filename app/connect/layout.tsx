"use client"

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
  Users,
  Paperclip,
  Camera,
  Plug,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  LifeBuoy,
  Wrench,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createContext, useContext, useState } from "react"
import { ProtectedRouteGuard } from "@/components/auth/auth-route-guard"
import { ConnectProvider, useConnect } from "@/components/connect/connect-store"
import { ConnectModals } from "@/components/connect/connect-modals"
import { ConnectHeaderActions } from "@/components/connect/connect-header-actions"
import { SupportProvider, useSupport } from "@/components/support/support-context"

const COS_LOGO_HEADER = "/travelpro-logo-horizontal.png"

const navItems = [
  { icon: Home, label: "Inicio", href: "/connect", exact: true },
  { icon: MessageSquare, label: "Conversas", href: "/connect/conversas" },
  { icon: Clock, label: "Historico", href: "/connect/historico" },
  { icon: User, label: "Voce", href: "/connect/voce" },
]

const sourceTypeIcon: Record<string, typeof Database> = {
  ERP: Database,
  CRM: Users,
  Planilha: FileSpreadsheet,
  "Banco de dados": Database,
  API: Plug,
  WhatsApp: MessageCircle,
  "E-mail": Mail,
  "Portal interno": Database,
}

const FABContext = createContext<{ isOpen: boolean; setIsOpen: (value: boolean) => void }>({
  isOpen: false,
  setIsOpen: () => {},
})

function useFAB() {
  return useContext(FABContext)
}

function ConnectActionSheet() {
  const { isOpen, setIsOpen } = useFAB()
  const { actions, sources, openModal } = useConnect()
  const { openSupport } = useSupport()

  const close = () => setIsOpen(false)

  const baseActions = [
    { icon: Users, label: "Equipe", color: "#f97316", bg: "#ffedd5", onClick: () => openModal("equipe") },
    { icon: Paperclip, label: "Arquivo", color: "#6b7280", bg: "#f3f4f6", onClick: () => openModal("arquivo") },
    { icon: Camera, label: "Foto", color: "#ec4899", bg: "#fce7f3", onClick: () => openModal("foto") },
    { icon: LifeBuoy, label: "Suporte", color: "#6b7280", bg: "#f3f4f6", onClick: () => openSupport() },
  ]

  const dynamicActions = actions.slice(0, 8)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:flex lg:items-center lg:justify-center"
            onClick={close}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 lg:inset-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-0 lg:pointer-events-none"
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl lg:pointer-events-auto lg:w-full lg:max-w-md">
              <div className="flex items-center justify-center border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-[#0a0a0a]">Criar novo</span>
              </div>

              <div className="p-2">
                <div className="grid grid-cols-4 gap-1">
                  {baseActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.onClick()
                        close()
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: action.bg }}>
                        <action.icon className="h-5 w-5" style={{ color: action.color }} />
                      </span>
                      <span className="text-xs font-medium text-gray-700">{action.label}</span>
                    </button>
                  ))}
                </div>

                {dynamicActions.length > 0 && (
                  <>
                    <div className="px-2 pb-1 pt-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Acoes configuradas</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {dynamicActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            openModal("configuredAction", { actionId: action.id })
                            close()
                          }}
                          className="flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                        >
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                            <Wrench className="h-5 w-5 text-gray-600" />
                          </span>
                          <span className="max-w-[60px] truncate text-xs font-medium text-gray-700">{action.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    openModal("system")
                    close()
                  }}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-t border-gray-100 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <Plug className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    {sources.length > 0 ? "Adicionar fonte" : "Conectar fonte"}
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={close}
              className="mt-2 w-full rounded-2xl bg-white py-3.5 text-center font-semibold text-gray-700 shadow-lg lg:hidden"
            >
              Cancelar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function BottomNav() {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useFAB()

  const items = [
    { icon: Home, label: "Inicio", href: "/connect", exact: true },
    { icon: MessageSquare, label: "Conversas", href: "/connect/conversas" },
    { icon: null, label: "", href: "" },
    { icon: Clock, label: "Historico", href: "/connect/historico" },
    { icon: User, label: "Voce", href: "/connect/voce" },
  ]

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-lg lg:hidden">
      <div className="flex h-16 items-center justify-around px-2 pb-safe">
        {items.map((item, index) => {
          if (index === 2) {
            return (
              <button key="fab" onClick={() => setIsOpen(!isOpen)} className="relative -mt-5">
                <motion.div
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="tp-gradient-chip flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
                >
                  <Plus className="h-6 w-6 text-white" />
                </motion.div>
              </button>
            )
          }

          const Icon = item.icon!
          const active = isActive(item.href, item.exact)

          return (
            <Link key={item.href} href={item.href} className="flex min-w-[60px] flex-col items-center gap-0.5">
              <Icon className={`h-5 w-5 ${active ? "text-[#0a0a0a]" : "text-gray-400"}`} />
              <span className={`text-[10px] ${active ? "font-medium text-[#0a0a0a]" : "text-gray-400"}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function GlobalHeader() {
  return (
    <header className="sticky top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-lg lg:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Image
            src={COS_LOGO_HEADER}
            alt="TravelPro"
            width={96}
            height={31}
            priority
            className="w-auto"
            style={{ height: "1.85rem", width: "auto" }}
          />
          <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-400">Connect</span>
        </div>
        <ConnectHeaderActions />
      </div>
    </header>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()
  const { sources, openModal, isLoading } = useConnect()

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <aside className="hidden h-screen w-[280px] flex-shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
        <div className="flex items-center gap-2">
          <Image
            src={COS_LOGO_HEADER}
            alt="TravelPro"
            width={96}
            height={31}
            priority
            className="w-auto"
            style={{ height: "1.85rem", width: "auto" }}
          />
          <span className="rounded-full border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Connect</span>
        </div>
        <ConnectHeaderActions />
      </div>

      <div className="space-y-2 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-gray-300 focus:outline-none"
          />
        </div>
        <button
          onClick={() => openModal("system")}
          className="tp-gradient-btn flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          <Plug className="h-4 w-4" />
          Conectar fonte
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Fontes</span>
        </div>
        {isLoading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Plug className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              Nenhuma fonte criada ainda. Conecte um sistema para comecar.
            </p>
          </div>
        ) : (
          sources.map((source) => {
            const Icon = sourceTypeIcon[source.sourceType] ?? Plug
            return (
              <button
                key={source.id}
                onClick={() => openModal("section", { sourceId: source.id })}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-4 w-4 text-gray-600" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#0a0a0a]">{source.name}</span>
                  <span className="block text-xs text-gray-400">
                    {source.sourceType} · {source.sectionsCount} sessoes
                  </span>
                </span>
                <span className="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                  {source.statusLabel}
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="border-t border-gray-100 p-2">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-lg py-2 transition-colors ${
                  active ? "bg-gray-100 text-[#0a0a0a]" : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                <item.icon className="h-4 w-4" />
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
  const { sources, summary, openModal, isLoading } = useConnect()

  const onboarding = [
    { icon: Database, label: "Conectar sistema", modal: "system" as const },
    { icon: FileSpreadsheet, label: "Importar planilha", modal: "spreadsheet" as const },
    { icon: Mail, label: "Conectar e-mail", modal: "email" as const },
    { icon: MessageCircle, label: "Conectar WhatsApp", modal: "whatsapp" as const },
  ]

  return (
    <aside className="hidden h-screen w-[300px] flex-shrink-0 border-l border-gray-200 bg-white xl:flex xl:flex-col">
      <div className="flex h-16 items-center border-b border-gray-100 px-4">
        <span className="text-sm font-semibold text-[#0a0a0a]">Contexto</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <>
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          </>
        ) : sources.length === 0 ? (
          <>
            <p className="mb-2 text-sm leading-relaxed text-gray-500">
              O COS Connect ainda nao possui fontes conectadas.
            </p>
            {onboarding.map((item) => (
              <button
                key={item.label}
                onClick={() => openModal(item.modal)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <item.icon className="h-4 w-4 text-gray-600" />
                </span>
                <span className="text-sm font-medium text-[#0a0a0a]">{item.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
              </button>
            ))}
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Fontes" value={summary.totalSources} />
                <Metric label="Sessoes" value={summary.totalSections} />
                <Metric label="Acoes" value={summary.totalActions} />
                <Metric label="Configuradas" value={summary.configuredSources} />
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Fontes configuradas</span>
            {sources.map((source) => {
              const Icon = sourceTypeIcon[source.sourceType] ?? Plug
              return (
                <div key={source.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">{source.name}</span>
                      <span className="block text-xs text-gray-400">
                        {source.sourceType} · {source.statusLabel}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openModal("section", { sourceId: source.id })}
                      className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Criar sessao
                    </button>
                    <button
                      onClick={() => openModal("action", { sourceId: source.id })}
                      className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Criar acao
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <span className="block text-xs text-gray-400">{label}</span>
      <span className="block text-base font-semibold text-[#0a0a0a]">{value}</span>
    </div>
  )
}

function ConnectShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <FABContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="min-h-screen bg-[#f5f5f3] lg:flex lg:h-screen lg:overflow-hidden">
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
          <GlobalHeader />
          <main className="pb-20 lg:flex-1 lg:overflow-y-auto lg:pb-0">{children}</main>
          <BottomNav />
        </div>
        <DesktopContextPanel />
        <ConnectActionSheet />
        <ConnectModals />
      </div>
    </FABContext.Provider>
  )
}

function ConnectProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectProvider>
      <SupportProvider>{children}</SupportProvider>
    </ConnectProvider>
  )
}

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteGuard>
      <ConnectProviders>
        <ConnectShell>{children}</ConnectShell>
      </ConnectProviders>
    </ProtectedRouteGuard>
  )
}
