"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { canAccessPath, resolveHomePath } from "@/lib/auth-routing"
import { useAuth } from "@/components/auth/auth-provider"

function GuardLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
        {label}
      </div>
    </div>
  )
}

export function ProtectedRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, workspace, isLoading, refresh } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const recoveryAttemptRef = useRef<string | null>(null)

  const loginHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set("next", pathname)
    return `/login?${params.toString()}`
  }, [pathname])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      setIsRedirecting(true)
      router.replace(loginHref)
      return
    }

    if (canAccessPath(pathname, { profile, workspace })) {
      recoveryAttemptRef.current = null
      setIsRedirecting(false)
      return
    }

    const recoveryKey = `${user.id}:${pathname}`

    if (recoveryAttemptRef.current !== recoveryKey) {
      recoveryAttemptRef.current = recoveryKey
      void refresh()
      return
    }

    const target = resolveHomePath({ profile, workspace })

    if (target && target !== pathname) {
      setIsRedirecting(true)
      router.replace(target)
      return
    }

    if (!target) {
      setIsRedirecting(true)
      router.replace("/login?workspace=missing")
      return
    }

    setIsRedirecting(false)
  }, [isLoading, user, pathname, profile, workspace, router, loginHref, refresh])

  if (isLoading || isRedirecting) {
    return <GuardLoading label="Verificando acesso..." />
  }

  if (!user) {
    return <GuardLoading label="Redirecionando para o login..." />
  }

  if (!canAccessPath(pathname, { profile, workspace })) {
    return <GuardLoading label="Organizando seu acesso..." />
  }

  return <>{children}</>
}

export function PublicAuthRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, workspace, isLoading } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      setIsRedirecting(false)
      return
    }

    const target = resolveHomePath({ profile, workspace })

    if (target && target !== pathname) {
      setIsRedirecting(true)
      router.replace(target)
      return
    }

    setIsRedirecting(false)
  }, [isLoading, user, profile, workspace, pathname, router])

  if (isLoading || isRedirecting) {
    return <GuardLoading label="Verificando sua sessão..." />
  }

  return <>{children}</>
}
