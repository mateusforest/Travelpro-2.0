"use server"

import { getUserAccessForUser } from "@/lib/auth"
import { humanizeActivityAction } from "@/lib/activity/humanize"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type ActivityRow = {
  id: string
  workspace_id: string | null
  area: string | null
  action: string | null
  description: string | null
  created_at: string | null
}

async function getActivityActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para histórico." as const }
  }

  return {
    workspaceId: access.workspace.id,
    adminClient,
  }
}

export async function getWorkspaceActivityLogsAction() {
  const actor = await getActivityActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("activity_logs")
    .select("id, workspace_id, area, action, description, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ActivityRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    logs: (data ?? []).map((log) => ({
      id: log.id,
      area: log.area || "sistema",
      action: log.action || "activity_logged",
      actionLabel: humanizeActivityAction(log.action, log.description),
      description: log.description || "Atividade registrada.",
      createdAt: log.created_at,
    })),
  }
}

export async function getPortalHomeOverviewAction() {
  const actor = await getActivityActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [logsResult, financialResult] = await Promise.all([
    actor.adminClient
      .from("activity_logs")
      .select("id, workspace_id, area, action, description, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ActivityRow[]>(),
    actor.adminClient
      .from("financial_entries")
      .select("type, amount, due_date, created_at, paid_at")
      .eq("workspace_id", actor.workspaceId)
      .returns<Array<{
        type: string | null
        amount: number | null
        due_date: string | null
        created_at: string | null
        paid_at: string | null
      }>>(),
  ])

  const error = logsResult.error || financialResult.error

  if (error) {
    return { error: error.message }
  }

  const entries = financialResult.data ?? []
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  let monthIncome = 0
  let monthExpense = 0
  let pendingAmount = 0

  for (const entry of entries) {
    const amount = typeof entry.amount === "number" ? entry.amount : 0
    const entryType = entry.type === "expense" ? "expense" : "income"
    const dueDateValue = entry.due_date || entry.created_at
    const dueDate = dueDateValue ? new Date(dueDateValue) : null
    const inCurrentMonth = dueDate ? dueDate >= monthStart && dueDate < monthEnd : false

    if (entryType === "income" && inCurrentMonth) {
      monthIncome += amount
    }

    if (entryType === "expense" && inCurrentMonth) {
      monthExpense += amount
    }

    if (!entry.paid_at) {
      pendingAmount += amount
    }
  }

  return {
    success: true,
    overview: {
      financial: {
        monthIncome,
        monthExpense,
        monthBalance: monthIncome - monthExpense,
        pendingAmount,
      },
      logs: (logsResult.data ?? []).map((log) => ({
        id: log.id,
        area: log.area || "sistema",
        action: log.action || "activity_logged",
        actionLabel: humanizeActivityAction(log.action, log.description),
        description: log.description || "Atividade registrada.",
        createdAt: log.created_at,
      })),
    },
  }
}
