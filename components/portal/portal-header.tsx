"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Search, Bell, Command, Menu, User, Settings, ExternalLink, LogOut } from "lucide-react"
import { usePortalUI } from "./portal-ui-context"
import { useAuth } from "@/components/auth/auth-provider"
import { logoutAction } from "@/actions/auth"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const notifications: { id: number; title: string; desc: string; time: string; unread: boolean }[] = []

export function PortalHeader({ placeholder = "Pergunte ao COS..." }: { placeholder?: string }) {
  const router = useRouter()
  const { toggleMobileMenu } = usePortalUI()
  const { user, profile, clearAuth } = useAuth()
  const [query, setQuery] = useState("")
  const [openMenu, setOpenMenu] = useState<"notif" | "profile" | null>(null)
  const [reads, setReads] = useState<number[]>([])
  const [isPending, startTransition] = useTransition()

  const unreadCount = notifications.filter((item) => item.unread && !reads.includes(item.id)).length
  const initials = (profile?.full_name || user?.email || "C").trim().charAt(0).toUpperCase()
  const displayName = profile?.full_name || user?.email || "Sua conta"
  const displayRole = profile?.global_role === "master" ? "Master" : "Administrador"

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/portal/conversas?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleLogout = () => {
    startTransition(async () => {
      clearAuth()
      const [result] = await Promise.all([
        logoutAction(),
        createSupabaseBrowserClient().auth.signOut(),
      ])
      setOpenMenu(null)
      router.replace(result.redirectTo || "/login")
    })
  }

  return (
    <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 bg-white flex-shrink-0">
      <button onClick={toggleMobileMenu} className="lg:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors mr-1" aria-label="Abrir menu">
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      <form onSubmit={submitSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-16 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-muted-foreground">
            <Command className="w-3.5 h-3.5" />
            <span className="text-xs">K</span>
          </div>
        </div>
      </form>

      <div className="flex items-center gap-2 sm:gap-4 ml-4 sm:ml-6">
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === "notif" ? null : "notif")} className="relative p-2 hover:bg-gray-50 rounded-xl transition-colors" aria-label="Notificações">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          <AnimatePresence>
            {openMenu === "notif" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-lg z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-sm">Notificações</span>
                    <button onClick={() => setReads(notifications.map((item) => item.id))} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Marcar todas como lidas
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")} className="tp-gradient-chip flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium cursor-pointer" aria-label="Menu do perfil">
            {initials}
          </button>
          <AnimatePresence>
            {openMenu === "profile" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-lg z-50 overflow-hidden py-1"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayRole}</p>
                  </div>
                  <Link href="/portal/configuracoes" onClick={() => setOpenMenu(null)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-muted-foreground" /> Meu perfil
                  </Link>
                  <Link href="/portal/configuracoes" onClick={() => setOpenMenu(null)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4 text-muted-foreground" /> Configurações
                  </Link>
                  <Link href="/app" onClick={() => setOpenMenu(null)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" /> Abrir app
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={handleLogout} disabled={isPending} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full">
                      <LogOut className="w-4 h-4" /> {isPending ? "Saindo..." : "Sair"}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export function PortalPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
