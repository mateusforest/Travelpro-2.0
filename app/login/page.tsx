"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { AuthLayout } from "@/components/cos/auth-layout"
import { ensureWorkspaceForCurrentUserAction, loginAction } from "@/actions/auth"
import { PublicAuthRouteGuard } from "@/components/auth/auth-route-guard"
import { useAuth } from "@/components/auth/auth-provider"
import type { WorkspaceType } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const { user: authenticatedUser, workspace, isLoading, syncAuth } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [needsWorkspaceSetup, setNeedsWorkspaceSetup] = useState(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("workspace") === "missing",
  )
  const [isPending, startTransition] = useTransition()
  const [isWorkspacePending, startWorkspaceTransition] = useTransition()
  const canRecoverWorkspace = Boolean(authenticatedUser && !workspace && !isLoading)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setNeedsWorkspaceSetup(false)

    startTransition(async () => {
      const result = await loginAction({
        email,
        password,
        nextPath:
          typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null,
      })

      if (result.error) {
        setError(result.error)
        setNeedsWorkspaceSetup(Boolean(result.needsWorkspaceSetup))
        return
      }

      if (result.redirectTo) {
        await syncAuth()
        router.replace(result.redirectTo)
      } else {
        router.refresh()
      }
      router.refresh()
    })
  }

  const handleCreateWorkspace = (productType: WorkspaceType) => {
    setError("")

    startWorkspaceTransition(async () => {
      const result = await ensureWorkspaceForCurrentUserAction({ productType })

      if (result.error) {
        setError(result.error)
        setNeedsWorkspaceSetup(true)
        return
      }

      if (result.redirectTo) {
        await syncAuth()
        router.replace(result.redirectTo)
        router.refresh()
      }
    })
  }

  return (
    <PublicAuthRouteGuard>
      <AuthLayout>
      <div className="flex justify-center mb-8">
        <Image
          src="/travelpro-logo-mark.png"
          alt="TravelPro"
          width={56}
          height={56}
          className="h-14 w-14 rounded-2xl object-contain"
        />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">Entrar no TravelPro</h1>
        <p className="text-[#737373] mt-2">Continue sua operação.</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
        >
          {error}
        </motion.div>
      )}

      {(needsWorkspaceSetup || canRecoverWorkspace) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4"
        >
          <p className="text-sm font-medium text-[#0a0a0a]">Criar workspace agora</p>
          <p className="mt-1 text-sm text-[#737373]">
            Sua conta foi autenticada, mas ainda não possui workspace. Crie seu ambiente operacional.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => handleCreateWorkspace("operations")}
              disabled={isWorkspacePending}
              className="tp-gradient-btn w-full rounded-xl px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorkspacePending ? "Criando..." : "Criar workspace TravelPro Operações"}
            </button>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-[#0a0a0a]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-[#0a0a0a]">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#e5e5e5] text-[#0a0a0a] focus:ring-[#0a0a0a]/20"
            />
            <span className="text-sm text-[#737373]">Lembrar de mim</span>
          </label>
          <Link href="/recuperar-senha" className="text-sm text-[#0a0a0a] hover:underline font-medium">
            Esqueci minha senha
          </Link>
        </div>

        <motion.button
          type="submit"
          disabled={isPending}
          whileTap={{ scale: 0.98 }}
          className="tp-gradient-btn flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Entrar"}
        </motion.button>
      </form>

      <p className="mt-8 text-center text-sm text-[#737373]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-[#0a0a0a] font-medium hover:underline">
          Criar conta
        </Link>
      </p>
      </AuthLayout>
    </PublicAuthRouteGuard>
  )
}
