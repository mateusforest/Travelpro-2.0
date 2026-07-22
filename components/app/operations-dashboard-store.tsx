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
import { getOperationsHomeContextAction } from "@/actions/operations-home"
import { subscribeOperationSync } from "@/lib/operation-sync"

type OperationsDashboardSummary = {
  clientsCount: number
  operationsCount: number
  documentsCount: number
  meetingsCount: number
  supportCount: number
  teamCount: number
  financial: {
    totalIncome: number
    totalExpense: number
    balance: number
    monthBalance: number
    entriesCount: number
  }
  activities: Array<{
    id: string
    area: string
    action: string
    description: string
    createdAt: string | null
  }>
}

type OperationsDashboardContextValue = {
  summary: OperationsDashboardSummary | null
  isLoading: boolean
  refreshSummary: (options?: { silent?: boolean; force?: boolean }) => Promise<void>
}

const OperationsDashboardContext = createContext<OperationsDashboardContextValue | null>(null)
const dashboardCache = new Map<string, OperationsDashboardSummary>()

function emptySummary(): OperationsDashboardSummary {
  return {
    clientsCount: 0,
    operationsCount: 0,
    documentsCount: 0,
    meetingsCount: 0,
    supportCount: 0,
    teamCount: 0,
    financial: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      monthBalance: 0,
      entriesCount: 0,
    },
    activities: [],
  }
}

export function OperationsDashboardProvider({
  workspaceId,
  children,
}: {
  workspaceId: string | null | undefined
  children: ReactNode
}) {
  const cachedSummary = workspaceId ? dashboardCache.get(workspaceId) ?? null : null
  const [summary, setSummary] = useState<OperationsDashboardSummary | null>(cachedSummary)
  const [isLoading, setIsLoading] = useState(!cachedSummary)
  const inFlightRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (!workspaceId) {
      setSummary(null)
      setIsLoading(false)
      return
    }

    const nextCachedSummary = dashboardCache.get(workspaceId) ?? null
    setSummary(nextCachedSummary)
    setIsLoading(!nextCachedSummary)
  }, [workspaceId])

  const refreshSummary = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!workspaceId) {
        setSummary(null)
        setIsLoading(false)
        return
      }

      if (inFlightRef.current && !options?.force) {
        return inFlightRef.current
      }

      const silent = options?.silent ?? false

      if (!silent && !dashboardCache.get(workspaceId)) {
        setIsLoading(true)
      }

      const task = (async () => {
        const result = await getOperationsHomeContextAction()

        if (result.success && result.summary) {
          dashboardCache.set(workspaceId, result.summary)
          setSummary(result.summary)
        } else if (!dashboardCache.get(workspaceId)) {
          setSummary(emptySummary())
        }

        if (!silent) {
          setIsLoading(false)
        }
      })()

      inFlightRef.current = task

      try {
        await task
      } finally {
        if (inFlightRef.current === task) {
          inFlightRef.current = null
        }
      }
    },
    [workspaceId],
  )

  useEffect(() => {
    void refreshSummary({ silent: Boolean(cachedSummary) })
  }, [cachedSummary, refreshSummary, workspaceId])

  useEffect(() => {
    return subscribeOperationSync(() => {
      void refreshSummary({ silent: true, force: true })
    })
  }, [refreshSummary])

  const value = useMemo(
    () => ({
      summary,
      isLoading,
      refreshSummary,
    }),
    [summary, isLoading, refreshSummary],
  )

  return <OperationsDashboardContext.Provider value={value}>{children}</OperationsDashboardContext.Provider>
}

export function useOperationsDashboard() {
  const context = useContext(OperationsDashboardContext)

  if (!context) {
    throw new Error("useOperationsDashboard deve ser usado dentro de OperationsDashboardProvider")
  }

  return context
}

export function useOptionalOperationsDashboard() {
  return useContext(OperationsDashboardContext)
}
