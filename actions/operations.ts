"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { logWorkspaceActivity } from "@/lib/activity/log"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type OperationStatus = "open" | "in_progress" | "completed" | "archived"
export type OperationPriority = "low" | "medium" | "high" | "urgent"

type OperationRow = {
  id: string
  workspace_id: string
  client_id: string | null
  title: string
  description: string | null
  status: OperationStatus | string | null
  priority: OperationPriority | string | null
  due_date: string | null
  created_by: string | null
  created_at: string | null
}

type OperationActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getOperationActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para operações." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies OperationActor
}

function normalizeStatus(status: string): OperationStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "in_progress" || normalized === "em andamento") return "in_progress"
  if (normalized === "completed" || normalized === "concluído" || normalized === "concluido") return "completed"
  if (normalized === "archived" || normalized === "arquivado") return "archived"
  return "open"
}

function normalizePriority(priority: string): OperationPriority {
  const normalized = priority.trim().toLowerCase()
  if (normalized === "low" || normalized === "baixa") return "low"
  if (normalized === "high" || normalized === "alta") return "high"
  if (normalized === "urgent" || normalized === "urgente") return "urgent"
  return "medium"
}

async function resolveOperationForActor(actor: OperationActor, operationId: string) {
  const { data, error } = await actor.adminClient
    .from("operations")
    .select("id, workspace_id, client_id, title, description, status, priority, due_date, created_by, created_at")
    .eq("id", operationId)
    .maybeSingle<OperationRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Operação não encontrada neste workspace." }
  }

  return { operation: data }
}

export async function getOperationsAction() {
  const actor = await getOperationActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("operations")
    .select("id, workspace_id, client_id, title, description, status, priority, due_date, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<OperationRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    operations: (data ?? []).map((operation) => ({
      id: operation.id,
      clientId: operation.client_id,
      title: operation.title,
      description: operation.description || "",
      status: normalizeStatus(operation.status ?? "open"),
      priority: normalizePriority(operation.priority ?? "medium"),
      dueDate: operation.due_date,
      createdAt: operation.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getOperationByIdAction({ operationId }: { operationId: string }) {
  const actor = await getOperationActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveOperationForActor(actor, operationId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  return {
    success: true,
    operation: {
      id: resolved.operation.id,
      clientId: resolved.operation.client_id,
      title: resolved.operation.title,
      description: resolved.operation.description || "",
      status: normalizeStatus(resolved.operation.status ?? "open"),
      priority: normalizePriority(resolved.operation.priority ?? "medium"),
      dueDate: resolved.operation.due_date,
      createdAt: resolved.operation.created_at,
    },
  }
}

export async function createOperationAction({
  clientId,
  title,
  description,
  status,
  priority,
  dueDate,
}: {
  clientId?: string
  title: string
  description: string
  status?: string
  priority?: string
  dueDate?: string
}) {
  const actor = await getOperationActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o título da operação." }
  }

  const { data, error } = await actor.adminClient
    .from("operations")
    .insert({
      workspace_id: actor.workspaceId,
      client_id: clientId?.trim() || null,
      title: trimmedTitle,
      description: description.trim() || null,
      status: normalizeStatus(status ?? "open"),
      priority: normalizePriority(priority ?? "medium"),
      due_date: dueDate || null,
      created_by: actor.actorId,
    })
    .select("id, workspace_id, client_id, title, description, status, priority, due_date, created_by, created_at")
    .single<OperationRow>()

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a operação." }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "operations",
    action: "operation_created",
    description: "operação criada",
  })

  return { success: true, operationId: data.id }
}

export async function updateOperationAction({
  operationId,
  clientId,
  title,
  description,
  status,
  priority,
  dueDate,
}: {
  operationId: string
  clientId?: string
  title: string
  description: string
  status: string
  priority: string
  dueDate?: string
}) {
  const actor = await getOperationActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar operações." }
  }

  const resolved = await resolveOperationForActor(actor, operationId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o título da operação." }
  }

  const { error } = await actor.adminClient
    .from("operations")
    .update({
      client_id: clientId?.trim() || null,
      title: trimmedTitle,
      description: description.trim() || null,
      status: normalizeStatus(status),
      priority: normalizePriority(priority),
      due_date: dueDate || null,
    })
    .eq("id", operationId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "operations",
    action: "operation_updated",
    description: "operação atualizada",
  })

  return { success: true }
}

export async function deleteOperationAction({ operationId }: { operationId: string }) {
  const actor = await getOperationActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem arquivar operações." }
  }

  const resolved = await resolveOperationForActor(actor, operationId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("operations")
    .update({
      status: "archived",
    })
    .eq("id", operationId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "operations",
    action: "operation_archived",
    description: "operação arquivada",
  })

  return { success: true }
}
