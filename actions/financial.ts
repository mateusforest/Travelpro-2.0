"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type FinancialEntryType = "income" | "expense"

type FinancialRow = {
  id: string
  workspace_id: string
  type: FinancialEntryType | string
  title: string
  amount: number | null
  category: string | null
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

type FinancialActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getFinancialActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para financeiro." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies FinancialActor
}

async function logFinancialActivity({
  adminClient,
  workspaceId,
  userId,
  action,
  description,
}: {
  adminClient: FinancialActor["adminClient"]
  workspaceId: string
  userId: string
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area: "financial",
    action,
    description,
  })

  if (error) {
    console.error("[financial] activity-log:", error.message)
  }
}

async function resolveFinancialEntryForActor(actor: FinancialActor, entryId: string) {
  const { data, error } = await actor.adminClient
    .from("financial_entries")
    .select("id, workspace_id, type, title, amount, category, due_date, paid_at, notes, created_by, created_at")
    .eq("id", entryId)
    .maybeSingle<FinancialRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Lançamento não encontrado neste workspace." }
  }

  return { entry: data }
}

function parseAmount(amount: string) {
  const normalized = amount.replace(/\./g, "").replace(",", ".").trim()
  const value = Number(normalized)
  return Number.isFinite(value) ? value : NaN
}

function normalizeEntryType(type: string): FinancialEntryType {
  const normalized = type.trim().toLowerCase()
  return normalized === "expense" || normalized === "gasto" ? "expense" : "income"
}

function currentMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export async function getFinancialEntriesAction() {
  const actor = await getFinancialActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("financial_entries")
    .select("id, workspace_id, type, title, amount, category, due_date, paid_at, notes, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<FinancialRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    entries: (data ?? []).map((entry) => ({
      id: entry.id,
      type: entry.type === "expense" ? "expense" : "income",
      title: entry.title,
      amount: typeof entry.amount === "number" ? entry.amount : 0,
      category: entry.category || "",
      dueDate: entry.due_date,
      paidAt: entry.paid_at,
      notes: entry.notes || "",
      createdAt: entry.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function createFinancialEntryAction({
  type,
  title,
  amount,
  category,
  dueDate,
  paidAt,
  notes,
}: {
  type: string
  title: string
  amount: string
  category: string
  dueDate: string
  paidAt?: string
  notes: string
}) {
  const actor = await getFinancialActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedTitle = title.trim()
  const parsedAmount = parseAmount(amount)

  if (!trimmedTitle) {
    return { error: "Informe o título do lançamento." }
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { error: "Informe um valor válido para o lançamento." }
  }

  const normalizedType = normalizeEntryType(type)

  const { data, error } = await actor.adminClient
    .from("financial_entries")
    .insert({
      workspace_id: actor.workspaceId,
      type: normalizedType,
      title: trimmedTitle,
      amount: parsedAmount,
      category: category.trim() || null,
      due_date: dueDate || null,
      paid_at: paidAt || null,
      notes: notes.trim() || null,
      created_by: actor.actorId,
    })
    .select("id, workspace_id, type, title, amount, category, due_date, paid_at, notes, created_by, created_at")
    .single<FinancialRow>()

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível registrar o lançamento." }
  }

  await logFinancialActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "financial_entry_created",
    description: normalizedType === "income" ? "ganho registrado" : "gasto registrado",
  })

  return { success: true, entryId: data.id }
}

export async function updateFinancialEntryAction({
  entryId,
  type,
  title,
  amount,
  category,
  dueDate,
  paidAt,
  notes,
}: {
  entryId: string
  type: string
  title: string
  amount: string
  category: string
  dueDate: string
  paidAt?: string
  notes: string
}) {
  const actor = await getFinancialActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar lançamentos." }
  }

  const resolved = await resolveFinancialEntryForActor(actor, entryId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedTitle = title.trim()
  const parsedAmount = parseAmount(amount)

  if (!trimmedTitle) {
    return { error: "Informe o título do lançamento." }
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { error: "Informe um valor válido para o lançamento." }
  }

  const { error } = await actor.adminClient
    .from("financial_entries")
    .update({
      type: normalizeEntryType(type),
      title: trimmedTitle,
      amount: parsedAmount,
      category: category.trim() || null,
      due_date: dueDate || null,
      paid_at: paidAt || null,
      notes: notes.trim() || null,
    })
    .eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  await logFinancialActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "financial_entry_updated",
    description: "lançamento financeiro atualizado",
  })

  return { success: true }
}

export async function deleteFinancialEntryAction({ entryId }: { entryId: string }) {
  const actor = await getFinancialActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem excluir lançamentos." }
  }

  const resolved = await resolveFinancialEntryForActor(actor, entryId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient.from("financial_entries").delete().eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  await logFinancialActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "financial_entry_deleted",
    description: "lançamento financeiro removido",
  })

  return { success: true }
}

export async function getFinancialSummaryAction() {
  const actor = await getFinancialActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("financial_entries")
    .select("id, workspace_id, type, title, amount, category, due_date, paid_at, notes, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .returns<FinancialRow[]>()

  if (error) {
    return { error: error.message }
  }

  const entries = data ?? []
  const { start, end } = currentMonthBounds()

  let totalIncome = 0
  let totalExpense = 0
  let monthIncome = 0
  let monthExpense = 0
  let pending = 0

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

    if (!entry.paid_at) {
      pending += amount
    }
  }

  return {
    success: true,
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      pendingAmount: pending,
      entriesCount: entries.length,
    },
  }
}
