"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Bell, X, User, SlidersHorizontal, Shield, LogOut, ExternalLink, Clock, Plug } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/components/auth/auth-provider"
import { useConnect } from "@/components/connect/connect-store"
import { logoutAction } from "@/actions/auth"
import { UserAvatar } from "@/components/shared/user-avatar"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const avatarMenu = [
  { icon: User, label: "Perfil", href: "/connect/voce" },
  { icon: SlidersHorizontal, label: "Preferencias", href: "/connect/voce" },
  { icon: Shield, label: "Seguranca", href: "/connect/voce/seguranca" },
]

export function ConnectHeaderActions() {
  const router = useRouter()
  const { user, profile, clearAuth } = useAuth()
  const { sources, mainSystem, openModal, toast } = useConnect()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  const displayName = profile?.full_name || user?.email || "Seu perfil"
  const displayEmail = profile?.email || user?.email || "Nenhum e-mail cadastrado"

  const handleSystem = () => {
    if (mainSystem?.url) {
      window.open(mainSystem.url, "_blank", "noopener,noreferrer")
      return
    }

    openModal("mainSystem")
  }

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
        <button onClick={() => setSearchOpen(true)} className="rounded-full p-2 transition-colors hover:bg-gray-100" aria-label="Buscar">
          <Search className="h-5 w-5 text-gray-500" />
        </button>
        <button onClick={() => setNotifOpen(true)} className="relative rounded-full p-2 transition-colors hover:bg-gray-100" aria-label="Notificacoes">
          <Bell className="h-5 w-5 text-gray-500" />
        </button>
        <div className="relative">
          <button onClick={() => setAvatarOpen((value) => !value)} className="block" aria-label="Menu do perfil">
            <UserAvatar
              fullName={profile?.full_name}
              email={profile?.email || user?.email}
              avatarUrl={profile?.avatar_url}
              size={32}
            />
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
                  className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
                >
                  <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                    <UserAvatar
                      fullName={profile?.full_name}
                      email={profile?.email || user?.email}
                      avatarUrl={profile?.avatar_url}
                      size={40}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0a0a0a]">{displayName}</p>
                      <p className="truncate text-xs text-gray-500">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    {avatarMenu.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
                      >
                        <item.icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-[#0a0a0a]">{item.label}</span>
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        setAvatarOpen(false)
                        handleSystem()
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-[#0a0a0a]">{mainSystem?.url ? "Acessar Sistema" : "Configurar sistema"}</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 p-1.5">
                    <button
                      onClick={handleLogout}
                      disabled={isPending}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 text-red-500" />
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed left-0 right-0 top-0 z-[70] p-4 sm:flex sm:justify-center">
              <div className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-xl">
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Converse com seus sistemas..."
                    className="min-w-0 flex-1 text-base outline-none placeholder:text-gray-400"
                  />
                  <button onClick={() => setSearchOpen(false)} className="rounded-full p-1 transition-colors hover:bg-gray-100" aria-label="Fechar">
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {sources.length > 0 ? "Fontes conectadas" : "Comece conectando"}
                  </p>
                  {sources.length > 0 ? (
                    sources
                      .filter((source) => source.name.toLowerCase().includes(query.toLowerCase()))
                      .map((source) => (
                        <button
                          key={source.id}
                          onClick={() => {
                            setSearchOpen(false)
                            toast(`Use as sessoes de ${source.name} em Conversas para falar com o COS.`)
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                        >
                          <Plug className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-[#0a0a0a]">{source.name}</span>
                          <span className="ml-auto text-xs text-gray-400">{source.sourceType}</span>
                        </button>
                      ))
                  ) : (
                    <button
                      onClick={() => {
                        setSearchOpen(false)
                        openModal("system")
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                    >
                      <Plug className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-[#0a0a0a]">Conectar primeira fonte</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setNotifOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed bottom-0 right-0 top-0 z-[70] flex w-full flex-col bg-white shadow-2xl sm:max-w-sm"
            >
              <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 px-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-gray-500" />
                  <span className="text-base font-semibold text-[#0a0a0a]">Notificacoes</span>
                </div>
                <button onClick={() => setNotifOpen(false)} className="rounded-full p-2 transition-colors hover:bg-gray-100" aria-label="Fechar">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                  <Bell className="h-5 w-5 text-gray-400" />
                </div>
                <p className="mb-1 text-sm font-medium text-[#0a0a0a]">Nenhuma notificacao ainda</p>
                <p className="text-sm leading-relaxed text-gray-500">
                  Quando o COS atualizar suas fontes, os alertas aparecerao aqui.
                </p>
              </div>
              <div className="border-t border-gray-100 p-3">
                <Link
                  href="/connect/historico"
                  onClick={() => setNotifOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Clock className="h-4 w-4" /> Ver historico
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
