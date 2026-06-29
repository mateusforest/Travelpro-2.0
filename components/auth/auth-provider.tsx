"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { ProfileRecord, WorkspaceRecord } from "@/lib/auth"

type AuthState = {
  user: {
    id: string
    email: string | null
  } | null
  profile: ProfileRecord | null
  workspace: WorkspaceRecord | null
  membershipRole: string | null
  canManageWorkspace: boolean
  isLoading: boolean
  refresh: () => Promise<void>
  syncAuth: () => Promise<void>
  clearAuth: () => void
}

const AuthContext = createContext<AuthState | null>(null)
const AUTH_CACHE_KEY = "cos:auth-context"

function emptyAuthState() {
  return {
    user: null,
    profile: null,
    workspace: null,
    membershipRole: null,
  }
}

function readCachedAuthState() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(AUTH_CACHE_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as ReturnType<typeof emptyAuthState>
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const cachedAuth = useMemo(() => readCachedAuthState(), [])
  const [user, setUser] = useState<AuthState["user"]>(cachedAuth?.user ?? null)
  const [profile, setProfile] = useState<ProfileRecord | null>(cachedAuth?.profile ?? null)
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(cachedAuth?.workspace ?? null)
  const [membershipRole, setMembershipRole] = useState<string | null>(cachedAuth?.membershipRole ?? null)
  const [isLoading, setIsLoading] = useState(!cachedAuth)
  const isMountedRef = useRef(true)
  const hydratePromiseRef = useRef<Promise<void> | null>(null)

  const applyAuthState = useCallback((nextState: ReturnType<typeof emptyAuthState>) => {
    setUser(nextState.user)
    setProfile(nextState.profile)
    setWorkspace(nextState.workspace)
    setMembershipRole(nextState.membershipRole)
  }, [])

  const clearAuth = useCallback(() => {
    const emptyState = emptyAuthState()
    applyAuthState(emptyState)
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_CACHE_KEY)
    }
    setIsLoading(false)
  }, [applyAuthState])

  const hydrateAuth = useCallback(async ({ silent }: { silent: boolean }) => {
    if (hydratePromiseRef.current) {
      return hydratePromiseRef.current
    }

    if (!silent) {
      setIsLoading(true)
    }

    const task = (async () => {
      try {
        const response = await fetch("/api/auth/context", {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          if (!silent && isMountedRef.current) {
            clearAuth()
          }
          return
        }

        const data = await response.json()
        if (!isMountedRef.current) {
          return
        }

        if (!data.user) {
          clearAuth()
          return
        }

        const nextState = {
          user: data.user,
          profile: data.profile,
          workspace: data.workspace,
          membershipRole: data.membershipRole,
        }

        applyAuthState(nextState)
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(nextState))
        }
        setIsLoading(false)
      } catch {
        if (!silent && isMountedRef.current) {
          clearAuth()
        }
      }
    })()

    hydratePromiseRef.current = task

    try {
      await task
    } finally {
      if (hydratePromiseRef.current === task) {
        hydratePromiseRef.current = null
      }
    }
  }, [applyAuthState, clearAuth])

  const refresh = useCallback(async () => {
    await hydrateAuth({ silent: true })
  }, [hydrateAuth])

  const syncAuth = useCallback(async () => {
    await hydrateAuth({ silent: false })
  }, [hydrateAuth])

  useEffect(() => {
    isMountedRef.current = true

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMountedRef.current) {
        return
      }

      if (!session?.user) {
        clearAuth()
        return
      }

      await hydrateAuth({ silent: Boolean(cachedAuth) })
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) {
        return
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        clearAuth()
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
      })
      void hydrateAuth({ silent: true })
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [cachedAuth, clearAuth, hydrateAuth, supabase])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      workspace,
      membershipRole,
      canManageWorkspace:
        profile?.global_role === "master" ||
        membershipRole === "owner" ||
        membershipRole === "admin",
      isLoading,
      refresh,
      syncAuth,
      clearAuth,
    }),
    [user, profile, workspace, membershipRole, isLoading, refresh, syncAuth, clearAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }

  return context
}
