"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Search, Menu, Command, User, Settings, LogOut } from "lucide-react"
import { useMaster } from "./master-store"
import { useMasterSession } from "./master-session"
import { UserAvatar } from "@/components/shared/user-avatar"

export function MasterHeader({ placeholder = "Buscar no Master..." }: { placeholder?: string }) {
  const { setMobileMenuOpen, showToast } = useMaster()
  const { displayName, displayEmail, initials, avatarUrl, isPending, handleLogout } = useMasterSession()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 bg-white flex-shrink-0">
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors mr-1"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={placeholder}
            readOnly
            onFocus={() => showToast("A busca global do Master ainda esta em preparacao nesta fase.")}
            className="w-full pl-10 pr-16 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-muted-foreground">
            <Command className="w-3.5 h-3.5" />
            <span className="text-xs">K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 sm:ml-6">
        <span className="hidden sm:inline-flex items-center text-xs font-medium text-muted-foreground border border-gray-200 rounded-full px-2.5 py-1">
          Equipe COS
        </span>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((value) => !value)}
            className="flex items-center justify-center"
            aria-label="Menu do perfil master"
          >
            <UserAvatar fullName={displayName} email={displayEmail} avatarUrl={avatarUrl} size={36} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    <UserAvatar fullName={displayName} email={displayEmail} avatarUrl={avatarUrl} size={40} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0a0a0a] truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <Link href="/master/configuracoes" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-[#0a0a0a]">Meu Perfil</span>
                    </Link>
                    <Link href="/master/configuracoes" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-[#0a0a0a]">Configurações</span>
                    </Link>
                  </div>
                  <div className="p-1.5 border-t border-gray-100">
                    <button onClick={() => handleLogout(() => setProfileOpen(false))} disabled={isPending} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors w-full">
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
    </header>
  )
}
