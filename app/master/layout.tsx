"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Users,
  CreditCard,
  Sparkles,
  Receipt,
  LifeBuoy,
  Plug,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"
import { ProtectedRouteGuard } from "@/components/auth/auth-route-guard"
import { MasterProvider, useMaster } from "@/components/master/master-store"
import { MasterModals, MasterToast } from "@/components/master/master-modals"

const COS_LOGO_HEADER =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20header-lB2hw9fMDONpyTpAYQaVVinJsAweku.png"
const COS_LOGO_MARK =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/master", exact: true },
  { icon: Building2, label: "Clientes", href: "/master/clientes" },
  { icon: Boxes, label: "Workspaces", href: "/master/workspaces" },
  { icon: Users, label: "Usuários", href: "/master/usuarios" },
  { icon: CreditCard, label: "Assinaturas", href: "/master/assinaturas" },
  { icon: Sparkles, label: "Créditos IA", href: "/master/creditos-ia" },
  { icon: Receipt, label: "Faturamento", href: "/master/faturamento" },
  { icon: LifeBuoy, label: "Suporte", href: "/master/suporte" },
  { icon: Plug, label: "Integrações", href: "/master/integracoes" },
  { icon: ScrollText, label: "Auditoria", href: "/master/auditoria" },
  { icon: Settings, label: "Configurações", href: "/master/configuracoes" },
]

function MasterShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileMenuOpen, setMobileMenuOpen } = useMaster()
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <div className="flex h-screen bg-white">
      {/* Overlay mobile */}
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

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative h-full bg-[#fafafa] border-r border-gray-100 flex flex-col z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: collapsed ? 72 : 240 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 h-16 flex-shrink-0">
          <Link href="/master" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            {collapsed ? (
              <Image src={COS_LOGO_MARK} alt="COS" width={28} height={28} priority style={{ height: "1.75rem", width: "auto" }} />
            ) : (
              <Image src={COS_LOGO_HEADER} alt="COS" width={88} height={28} priority className="w-auto" style={{ height: "1.6rem", width: "auto" }} />
            )}
          </Link>
          {!collapsed && (
            <span className="text-[10px] font-medium text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">Master</span>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      active ? "bg-white shadow-sm text-foreground font-medium" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Rodapé */}
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed ? "justify-center" : ""}`}>
            <span className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-gray-600" />
            </span>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Equipe COS</p>
                <p className="text-xs text-muted-foreground truncate">Acesso master</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden lg:flex items-center justify-center w-full mt-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>

      <MasterModals />
      <MasterToast />
    </div>
  )
}

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteGuard>
      <MasterProvider>
        <MasterShell>{children}</MasterShell>
      </MasterProvider>
    </ProtectedRouteGuard>
  )
}
