"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Bell, X, User, SlidersHorizontal, Shield, LogOut, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { logoutAction } from "@/actions/auth"
import { useAuth } from "@/components/auth/auth-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { appSessionHrefs } from "@/lib/area-configs"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const notifications: { id: number; title: string; desc: string; time: string; dot: string; unread: boolean }[] = []

const searchSuggestions = [
  { label: "Clientes", href: appSessionHrefs.clientes },
  { label: "Viagens em andamento", href: appSessionHrefs.viagens },
  { label: "Balanço financeiro", href: appSessionHrefs.financeiro },
  { label: "Agenda da semana", href: appSessionHrefs.agenda },
  { label: "Documentos recentes", href: appSessionHrefs.documentos },
]

const avatarMenu = [
  { icon: User, label: "Perfil", href: "/app/voce" },
  { icon: SlidersHorizontal, label: "Preferências", href: "/app/voce" },
  { icon: Shield, label: "Segurança", href: "/app/voce/seguranca" },
  { icon: ExternalLink, label: "Acessar Portal", href: "/portal" },
]

export function HeaderActions({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
  const router = useRouter()
  const { user, profile, clearAuth } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  const unreadCount = notifications.filter((item) => item.unread).length
  const displayName = profile?.full_name || user?.email || "Seu perfil"
  const displayEmail = profile?.email || user?.email || "Nenhum e-mail cadastrado"

  const handleLogout = () => {
    startTransition(async () => {
      clearAuth()
      const [result] = await Promise.all([
        logoutAction(),
        createSupabaseBrowserClient().auth.signOut(),
      ])
      setAvatarOpen(false)
      router.replace(result.redirectTo || "/login")
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Buscar">
          <Search className="w-5 h-5 text-gray-500" />
        </button>
        <button onClick={() => setNotifOpen(true)} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Notificações">
          <Bell className="w-5 h-5 text-gray-500" />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />}
        </button>
        <div className="relative">
          <button onClick={() => setAvatarOpen((value) => !value)} className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 block" aria-label="Menu do perfil">
            <UserAvatar fullName={profile?.full_name} email={profile?.email || user?.email} avatarUrl={profile?.avatar_url} size={32} />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className={`z-50 rounded-2xl border border-gray-100 bg-white shadow-xl ${
                    variant === "desktop"
                      ? "absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-5rem)] origin-top-right overflow-y-auto"
                      : "absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-5rem)] origin-top-right overflow-y-auto"
                  }`}
                >
                  <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    <UserAvatar fullName={profile?.full_name} email={profile?.email || user?.email} avatarUrl={profile?.avatar_url} size={40} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0a0a0a] truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    {avatarMenu.map((item) => (
                      <Link key={item.label} href={item.href} onClick={() => setAvatarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-[#0a0a0a]">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="p-1.5 border-t border-gray-100">
                    <button onClick={handleLogout} disabled={isPending} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors w-full">
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">{isPending ? "Saindo..." : "Sair"}</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setSearchOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-0 left-0 right-0 z-[70] p-4 sm:flex sm:justify-center">
              <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar clientes, operações, documentos..." className="flex-1 min-w-0 text-base outline-none placeholder:text-gray-400" />
                  <button onClick={() => setSearchOpen(false)} className="p-1 rounded-full hover:bg-gray-100" aria-label="Fechar">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{query ? "Resultados" : "Sugestões"}</p>
                  {searchSuggestions.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).map((item) => (
                    <Link key={item.label} href={item.href} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-[#0a0a0a]">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setNotifOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-full sm:max-w-sm bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <span className="text-base font-semibold text-[#0a0a0a]">Notificações</span>
                </div>
                <button onClick={() => setNotifOpen(false)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Fechar">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="px-4 py-10 text-center text-sm text-gray-500">Nenhuma notificação ainda.</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
