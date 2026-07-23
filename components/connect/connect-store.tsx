"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { updatePrimarySystemAction } from "@/actions/workspace"
import { getConnectWorkspaceOverviewAction } from "@/actions/connect"

type ConnectOverviewCache = {
  sources: ConnectSource[]
  sections: ConnectSection[]
  actions: ConnectAction[]
  summary: {
    configuredSources: number
    totalSources: number
    totalSections: number
    totalActions: number
  }
  canManage: boolean
}

const connectOverviewCache = new Map<string, ConnectOverviewCache>()

export type ConnectSection = {
  id: string
  sourceId: string
  name: string
  description: string
  config: Record<string, unknown>
  createdAt: string | null
}

export type ConnectAction = {
  id: string
  sourceId: string
  name: string
  actionType: string
  config: Record<string, unknown>
  createdAt: string | null
}

export type ConnectSource = {
  id: string
  name: string
  sourceType: string
  status: "not_configured" | "configured" | "connected" | "error" | "paused"
  statusLabel: string
  accessUrl: string
  config: Record<string, unknown>
  createdAt: string | null
  sectionsCount: number
  actionsCount: number
  sections: ConnectSection[]
  actions: ConnectAction[]
}

export type MainSystem = {
  name: string
  type: string
  url: string
  notes?: string
}

export type ConnectModal =
  | "system"
  | "spreadsheet"
  | "email"
  | "whatsapp"
  | "mainSystem"
  | "equipe"
  | "arquivo"
  | "foto"
  | "section"
  | "action"
  | "deleteSource"
  | "configuredAction"
  | null

type ConnectModalState = {
  type: ConnectModal
  sourceId?: string
  actionId?: string
}

type ConnectContextValue = {
  sources: ConnectSource[]
  sections: ConnectSection[]
  actions: ConnectAction[]
  hasSources: boolean
  summary: {
    configuredSources: number
    totalSources: number
    totalSections: number
    totalActions: number
  }
  isLoading: boolean
  canManage: boolean
  refreshData: (options?: { silent?: boolean }) => Promise<void>
  mainSystem: MainSystem | null
  setMainSystem: (system: MainSystem) => Promise<{ error?: string }>
  modal: ConnectModalState | null
  openModal: (modal: ConnectModal, payload?: { sourceId?: string; actionId?: string }) => void
  closeModal: () => void
  selectedSource: ConnectSource | null
  selectedAction: ConnectAction | null
  toast: (message: string) => void
}

const ConnectContext = createContext<ConnectContextValue | null>(null)

export function useConnect() {
  const ctx = useContext(ConnectContext)
  if (!ctx) throw new Error("useConnect deve ser usado dentro de ConnectProvider")
  return ctx
}

export function ConnectProvider({ children }: { children: ReactNode }) {
  const { workspace } = useAuth()
  const cachedOverview = workspace?.id ? connectOverviewCache.get(workspace.id) ?? null : null
  const [sources, setSources] = useState<ConnectSource[]>(cachedOverview?.sources ?? [])
  const [sections, setSections] = useState<ConnectSection[]>(cachedOverview?.sections ?? [])
  const [actions, setActions] = useState<ConnectAction[]>(cachedOverview?.actions ?? [])
  const [summary, setSummary] = useState({
    configuredSources: cachedOverview?.summary.configuredSources ?? 0,
    totalSources: cachedOverview?.summary.totalSources ?? 0,
    totalSections: cachedOverview?.summary.totalSections ?? 0,
    totalActions: cachedOverview?.summary.totalActions ?? 0,
  })
  const [canManage, setCanManage] = useState(cachedOverview?.canManage ?? false)
  const [isLoading, setIsLoading] = useState(!cachedOverview)
  const [modal, setModal] = useState<ConnectModalState | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [mainSystemOverride, setMainSystemOverride] = useState<MainSystem | null>(null)

  const refreshData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (!silent && !cachedOverview) {
        setIsLoading(true)
      }

      const result = await getConnectWorkspaceOverviewAction()

      if (result.success && result.overview) {
        if (workspace?.id) {
          connectOverviewCache.set(workspace.id, result.overview)
        }
        setSources(result.overview.sources ?? [])
        setSections(result.overview.sections ?? [])
        setActions(result.overview.actions ?? [])
        setSummary(result.overview.summary)
        setCanManage(result.overview.canManage)
      } else {
        setSources([])
        setSections([])
        setActions([])
        setSummary({
          configuredSources: 0,
          totalSources: 0,
          totalSections: 0,
          totalActions: 0,
        })
        setCanManage(false)
      }

      if (!silent) {
        setIsLoading(false)
      }
    },
    [cachedOverview, workspace?.id],
  )

  useEffect(() => {
    void refreshData()
  }, [refreshData, workspace?.id])

  const setMainSystem = useCallback(
    async (system: MainSystem) => {
      const result = await updatePrimarySystemAction({
        primarySystemName: system.name,
        primarySystemUrl: system.url,
        primarySystemType: system.type,
        primarySystemNotes: system.notes ?? "",
      })

      if (result.error) {
        return { error: result.error }
      }

      const normalizedUrl = /^https?:\/\//i.test(system.url.trim()) ? system.url.trim() : `https://${system.url.trim()}`
      setMainSystemOverride({
        name: system.name,
        type: system.type,
        url: normalizedUrl,
        notes: system.notes ?? "",
      })
      return {}
    },
    [],
  )

  const openModal = useCallback((type: ConnectModal, payload?: { sourceId?: string; actionId?: string }) => {
    setModal({
      type,
      sourceId: payload?.sourceId,
      actionId: payload?.actionId,
    })
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  const toast = useCallback((message: string) => {
    setToastMsg(message)
    window.clearTimeout((toast as unknown as { _t?: number })._t)
    ;(toast as unknown as { _t?: number })._t = window.setTimeout(() => setToastMsg(null), 2800)
  }, [])

  const mainSystem = mainSystemOverride ??
    (workspace?.primary_system_name || workspace?.primary_system_url
      ? {
          name: workspace?.primary_system_name ?? "Sistema principal",
          type: workspace?.metadata?.primary_system_type || "Sistema",
          url: workspace?.primary_system_url ?? "",
          notes: workspace?.metadata?.primary_system_notes || "",
        }
      : null)

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === modal?.sourceId) ?? null,
    [modal?.sourceId, sources],
  )

  const selectedAction = useMemo(
    () => actions.find((connectAction) => connectAction.id === modal?.actionId) ?? null,
    [actions, modal?.actionId],
  )

  return (
    <ConnectContext.Provider
      value={{
        sources,
        sections,
        actions,
        hasSources: sources.length > 0,
        summary,
        isLoading,
        canManage,
        refreshData,
        mainSystem,
        setMainSystem,
        modal,
        openModal,
        closeModal,
        selectedSource,
        selectedAction,
        toast,
      }}
    >
      {children}

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-[80] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-white shadow-xl lg:bottom-6"
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
            <span className="text-sm">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ConnectContext.Provider>
  )
}
