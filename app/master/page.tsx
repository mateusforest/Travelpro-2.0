"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  Boxes,
  Users,
  DollarSign,
  Sparkles,
  LifeBuoy,
  Plug,
  ArrowUpRight,
  Plus,
} from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, KpiCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"
import { getMasterOverviewAction } from "@/actions/master"

type DashboardStats = {
  activeClients: number
  activeWorkspaces: number
  totalUsers: number
  monthlyRevenue: number
  monthlyRevenueLabel: string
  aiUsageTokens: number
  openSupportTickets: number
  activeIntegrations: number
}

type RecentActivity = {
  id: string
  action: string
  actionLabel?: string
  description: string
  workspaceName: string
  createdAt: string | null
}

type TopClient = {
  name: string
  type: string
  status: string
  users: number
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Agora"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function MasterOverviewPage() {
  const { openModal } = useMaster()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      const overviewResult = await getMasterOverviewAction()
      const nextError = overviewResult.error || null

      if (nextError) {
        setError(nextError)
        setStats(null)
        setActivities([])
        setTopClients([])
        setIsLoading(false)
        return
      }

      setStats((overviewResult.overview?.stats ?? null) as DashboardStats | null)
      setActivities((overviewResult.overview?.activities ?? []) as RecentActivity[])
      setTopClients((overviewResult.overview?.topClients ?? []) as TopClient[])
      setIsLoading(false)
    }

    void load()
  }, [])

  const kpis = [
    { label: "Clientes ativos", value: String(stats?.activeClients ?? 0), sublabel: "Workspaces da plataforma", icon: Building2 },
    { label: "Workspaces ativos", value: String(stats?.activeWorkspaces ?? 0), sublabel: "Operacoes e Connect", icon: Boxes },
    { label: "Usuarios totais", value: String(stats?.totalUsers ?? 0), sublabel: "Perfis cadastrados", icon: Users },
    { label: "Receita mensal", value: stats?.monthlyRevenueLabel ?? "R$ 0,00", sublabel: "Invoices pagas do mes", icon: DollarSign },
    { label: "Uso de IA", value: String(stats?.aiUsageTokens ?? 0), sublabel: "tokens registrados", icon: Sparkles },
    { label: "Chamados abertos", value: String(stats?.openSupportTickets ?? 0), sublabel: "open, in_progress e waiting", icon: LifeBuoy },
    { label: "Integracoes ativas", value: String(stats?.activeIntegrations ?? 0), sublabel: "connect_sources conectadas", icon: Plug },
  ]

  return (
    <div className="flex flex-1 flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <MasterPageHeader
            title="Painel Master COS"
            description="Visao geral da operacao da plataforma."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("cliente")}>Novo cliente</PrimaryButton>}
          />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5">
                    <div className="mb-4 h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="mb-2 h-8 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                  </div>
                ))
              : kpis.map((kpi, index) => <KpiCard key={kpi.label} {...kpi} delay={index * 0.04} />)}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 lg:col-span-2"
            >
              <h2 className="mb-5 font-semibold">Atividade recente</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 py-3">
                      <span className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
                        <div className="h-3 w-56 animate-pulse rounded bg-gray-100" />
                      </div>
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
              ) : (
                <div className="space-y-1">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 border-b border-gray-50 py-3 last:border-0">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-50">
                        <ArrowUpRight className="h-4 w-4 text-gray-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{activity.actionLabel || activity.action}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {activity.description}
                          {activity.workspaceName ? ` · ${activity.workspaceName}` : ""}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">{formatDateLabel(activity.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <h2 className="mb-5 font-semibold">Principais clientes</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
                        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                      </div>
                      <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : topClients.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {topClients.map((client) => (
                    <div key={client.name} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.type} · {client.users} usuario(s)
                        </p>
                      </div>
                      <StatusBadge status={client.status} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
