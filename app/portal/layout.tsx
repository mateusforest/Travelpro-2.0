"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Home,
  MessageSquare,
  ClipboardList,
  Briefcase,
  TrendingUp,
  DollarSign,
  UsersRound,
  FileText,
  Video,
  BarChart3,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Monitor,
  MoreVertical,
  FileSignature,
  Headphones,
  Star,
} from "lucide-react"
import { ProtectedRouteGuard } from "@/components/auth/auth-route-guard"
import { PortalUIProvider, usePortalUI } from "@/components/portal/portal-ui-context"
import { PortalInteractionsProvider, usePortalInteractions } from "@/components/portal/portal-interactions"
import { Toaster } from "@/components/ui/toaster"

const mainNavItems = [
  { icon: Home, label: "Início", href: "/portal" },
  { icon: MessageSquare, label: "Conversas", href: "/portal/conversas" },
  { icon: ClipboardList, label: "Cadastros", href: "/portal/cadastros" },
  { icon: Briefcase, label: "Operações", href: "/portal/operacoes" },
  { icon: TrendingUp, label: "Vendas", href: "/portal/vendas" },
  { icon: DollarSign, label: "Financeiro", href: "/portal/financeiro" },
  { icon: UsersRound, label: "Equipe", href: "/portal/equipe" },
  { icon: FileText, label: "Documentos", href: "/portal/documentos" },
  { icon: Video, label: "Reuniões", href: "/portal/reunioes" },
  { icon: BarChart3, label: "Relatórios", href: "/portal/relatorios" },
  { icon: Plug, label: "Integrações", href: "/portal/integracoes" },
  { icon: Settings, label: "Configurações", href: "/portal/configuracoes" },
]

const favoriteItems = [
  { icon: FileSignature, label: "Propostas", href: "/portal/vendas/propostas" },
  { icon: FileText, label: "Contratos", href: "/portal/documentos/contratos" },
  { icon: Headphones, label: "Atendimentos", href: "/portal/operacoes/atendimentos" },
  { icon: DollarSign, label: "Balanço", href: "/portal/financeiro/balanco" },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteGuard>
      <PortalUIProvider>
        <PortalInteractionsProvider>
          <PortalShell>{children}</PortalShell>
          <Toaster />
        </PortalInteractionsProvider>
      </PortalUIProvider>
    </ProtectedRouteGuard>
  )
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { mobileMenuOpen, setMobileMenuOpen } = usePortalUI()
  const { openInstall } = usePortalInteractions()
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-white">
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        className={`fixed lg:relative h-full bg-[#fafafa] border-r border-gray-100 flex flex-col z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: sidebarCollapsed ? 72 : 240 }}
      >
        <div className="flex items-center justify-between p-4 h-16">
          <Link href="/portal" className="flex items-center gap-2">
            {sidebarCollapsed ? (
              <Image
                src="/travelpro-logo-mark.png"
                alt="TravelPro"
                width={28}
                height={28}
                priority
                style={{ height: "1.75rem", width: "auto" }}
              />
            ) : (
              <Image
                src="/travelpro-logo-horizontal.png"
                alt="TravelPro"
                width={88}
                height={28}
                priority
                className="w-auto"
                style={{ height: "1.6rem", width: "auto" }}
              />
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>

          {!sidebarCollapsed && (
            <div className="mt-8">
              <div className="flex items-center gap-2 px-3 mb-2">
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Favoritos</span>
              </div>
              <ul className="space-y-1">
                {favoriteItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={openInstall}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground transition-all ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              {!sidebarCollapsed && <Monitor className="w-4 h-4" />}
            </div>
            {!sidebarCollapsed && <span className="text-sm">Instalar TravelPro</span>}
          </button>

          <div className={`flex items-center gap-3 mt-2 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-all cursor-pointer ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="tp-gradient-chip flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
              J
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Sua conta</p>
                <p className="text-xs text-muted-foreground truncate">Administrador</p>
              </div>
            )}
            {!sidebarCollapsed && <MoreVertical className="w-4 h-4 text-muted-foreground" />}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden lg:flex items-center justify-center w-full mt-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}
