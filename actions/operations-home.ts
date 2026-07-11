"use server"

import { getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type FinancialSummaryRow = {
  type: string | null
  amount: number | null
  due_date: string | null
  created_at: string | null
}

type ActivityLogRow = {
  id: string
  area: string | null
  action: string | null
  description: string | null
  created_at: string | null
}

function currentMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export async function getOperationsHomeContextAction() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para o dashboard." }
  }

  const workspaceId = access.workspace.id

  const [
    activeClientsResult,
    activeTripsResult,
    activeDocumentsResult,
    activeMeetingsResult,
    supportTicketsResult,
    workspaceMembersResult,
    financialEntriesResult,
    activityLogsResult,
  ] = await Promise.all([
    adminClient
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    adminClient
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
    adminClient
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
    adminClient
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    adminClient
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    adminClient
      .from("financial_entries")
      .select("type, amount, due_date, created_at")
      .eq("workspace_id", workspaceId)
      .returns<FinancialSummaryRow[]>(),
    adminClient
      .from("activity_logs")
      .select("id, area, action, description, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ActivityLogRow[]>(),
  ])

  const actionError =
    activeClientsResult.error ||
    activeTripsResult.error ||
    activeDocumentsResult.error ||
    activeMeetingsResult.error ||
    supportTicketsResult.error ||
    workspaceMembersResult.error ||
    financialEntriesResult.error ||
    activityLogsResult.error

  if (actionError) {
    return { error: actionError.message }
  }

  const entries = financialEntriesResult.data ?? []
  const { start, end } = currentMonthBounds()

  let totalIncome = 0
  let totalExpense = 0
  let monthIncome = 0
  let monthExpense = 0

  for (const entry of entries) {
    const amount = typeof entry.amount === "number" ? entry.amount : 0
    const entryType = entry.type === "expense" ? "expense" : "income"
    const dueDateValue = entry.due_date || entry.created_at
    const dueDate = dueDateValue ? new Date(dueDateValue) : null
    const inCurrentMonth = dueDate ? dueDate >= start && dueDate < end : false

    if (entryType === "income") {
      totalIncome += amount
      if (inCurrentMonth) monthIncome += amount
    } else {
      totalExpense += amount
      if (inCurrentMonth) monthExpense += amount
    }
  }

  return {
    success: true,
    summary: {
      clientsCount: activeClientsResult.count ?? 0,
      operationsCount: activeTripsResult.count ?? 0,
      documentsCount: activeDocumentsResult.count ?? 0,
      meetingsCount: activeMeetingsResult.count ?? 0,
      supportCount: supportTicketsResult.count ?? 0,
      teamCount: workspaceMembersResult.count ?? 0,
      financial: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        monthBalance: monthIncome - monthExpense,
        entriesCount: entries.length,
      },
      activities: (activityLogsResult.data ?? []).map((log) => ({
        id: log.id,
        area: log.area || "system",
        action: log.action || "activity_logged",
        description: log.description || "Atividade registrada.",
        createdAt: log.created_at,
      })),
    },
  }
}
