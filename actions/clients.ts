"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type ClientStatus = "active" | "archived"

type ClientRow = {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  status: ClientStatus | string | null
  created_by: string | null
  created_at: string | null
}

type ClientActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getClientActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para clientes." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies ClientActor
}

async function logClientActivity({
  adminClient,
  workspaceId,
  userId,
  action,
  description,
}: {
  adminClient: ClientActor["adminClient"]
  workspaceId: string
  userId: string
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area: "clients",
    action,
    description,
  })

  if (error) {
    console.error("[clients] activity-log:", error.message)
  }
}

async function resolveClientForActor(actor: ClientActor, clientId: string) {
  const { data, error } = await actor.adminClient
    .from("clients")
    .select("id, workspace_id, name, email, phone, company, notes, status, created_by, created_at")
    .eq("id", clientId)
    .maybeSingle<ClientRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Cliente não encontrado neste workspace." }
  }

  return { client: data }
}

export async function getClientsAction() {
  const actor = await getClientActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("clients")
    .select("id, workspace_id, name, email, phone, company, notes, status, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<ClientRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    clients: (data ?? []).map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      notes: client.notes || "",
      status: client.status === "archived" ? "archived" : "active",
      createdAt: client.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getClientByIdAction({ clientId }: { clientId: string }) {
  const actor = await getClientActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveClientForActor(actor, clientId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  return {
    success: true,
    client: {
      id: resolved.client.id,
      name: resolved.client.name,
      email: resolved.client.email || "",
      phone: resolved.client.phone || "",
      company: resolved.client.company || "",
      notes: resolved.client.notes || "",
      status: resolved.client.status === "archived" ? "archived" : "active",
      createdAt: resolved.client.created_at,
    },
  }
}

export async function createClientAction({
  name,
  email,
  phone,
  company,
  notes,
  status,
}: {
  name: string
  email: string
  phone: string
  company: string
  notes: string
  status: string
}) {
  const actor = await getClientActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do cliente." }
  }

  const normalizedStatus: ClientStatus = status === "archived" ? "archived" : "active"

  const { data, error } = await actor.adminClient
    .from("clients")
    .insert({
      workspace_id: actor.workspaceId,
      name: trimmedName,
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      notes: notes.trim() || null,
      status: normalizedStatus,
      created_by: actor.actorId,
    })
    .select("id, workspace_id, name, email, phone, company, notes, status, created_by, created_at")
    .single<ClientRow>()

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o cliente." }
  }

  await logClientActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "client_created",
    description: "cliente criado",
  })

  return { success: true, clientId: data.id }
}

export async function updateClientAction({
  clientId,
  name,
  email,
  phone,
  company,
  notes,
  status,
}: {
  clientId: string
  name: string
  email: string
  phone: string
  company: string
  notes: string
  status: string
}) {
  const actor = await getClientActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar clientes." }
  }

  const resolved = await resolveClientForActor(actor, clientId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do cliente." }
  }

  const { error } = await actor.adminClient
    .from("clients")
    .update({
      name: trimmedName,
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      notes: notes.trim() || null,
      status: status === "archived" ? "archived" : "active",
    })
    .eq("id", clientId)

  if (error) {
    return { error: error.message }
  }

  await logClientActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "client_updated",
    description: "cliente atualizado",
  })

  return { success: true, clientId: resolved.client.id, clientName: trimmedName }
}

export async function deleteClientAction({ clientId }: { clientId: string }) {
  const actor = await getClientActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem arquivar clientes." }
  }

  const resolved = await resolveClientForActor(actor, clientId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("clients")
    .update({
      status: "archived",
    })
    .eq("id", clientId)

  if (error) {
    return { error: error.message }
  }

  await logClientActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "client_archived",
    description: "cliente arquivado",
  })

  return { success: true }
}
