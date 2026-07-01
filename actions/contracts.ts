"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type ContractStatus = "draft" | "sent" | "signed" | "cancelled" | "archived"

type ContractRow = {
  id: string
  workspace_id: string
  client_id: string | null
  trip_id: string | null
  quote_id: string | null
  title: string
  status: ContractStatus | string | null
  signed_at: string | null
  file_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

type WorkspaceLookupRow = {
  id: string
  workspace_id: string
}

type ContractActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getContractActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para contratos." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies ContractActor
}

function normalizeContractStatus(status: string): ContractStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "sent" || normalized === "enviado") return "sent"
  if (normalized === "signed" || normalized === "assinado") return "signed"
  if (normalized === "cancelled" || normalized === "cancelado" || normalized === "cancelada") return "cancelled"
  if (normalized === "archived" || normalized === "arquivado") return "archived"
  return "draft"
}

async function resolveContractForActor(actor: ContractActor, contractId: string) {
  const { data, error } = await actor.adminClient
    .from("contracts")
    .select("id, workspace_id, client_id, trip_id, quote_id, title, status, signed_at, file_url, notes, created_by, created_at")
    .eq("id", contractId)
    .maybeSingle<ContractRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Contrato nao encontrado neste workspace." }
  }

  return { contract: data }
}

async function validateWorkspaceLink(
  actor: ContractActor,
  table: "clients" | "trips" | "quotes",
  recordId?: string,
) {
  const normalizedId = recordId?.trim()

  if (!normalizedId) {
    return { id: null as string | null }
  }

  const { data, error } = await actor.adminClient
    .from(table)
    .select("id, workspace_id")
    .eq("id", normalizedId)
    .maybeSingle<WorkspaceLookupRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    const label = table === "clients" ? "Cliente" : table === "trips" ? "Viagem" : "Cotacao"
    return { error: `${label} nao encontrada neste workspace.` }
  }

  return { id: data.id }
}

export async function getContractsAction() {
  const actor = await getContractActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("contracts")
    .select("id, workspace_id, client_id, trip_id, quote_id, title, status, signed_at, file_url, notes, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<ContractRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    contracts: (data ?? []).map((contract) => ({
      id: contract.id,
      clientId: contract.client_id,
      tripId: contract.trip_id,
      quoteId: contract.quote_id,
      title: contract.title,
      status: normalizeContractStatus(contract.status ?? "draft"),
      signedAt: contract.signed_at,
      fileUrl: contract.file_url || "",
      notes: contract.notes || "",
      createdAt: contract.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function createContractAction({
  clientId,
  tripId,
  quoteId,
  title,
  status,
  signedAt,
  fileUrl,
  notes,
}: {
  clientId?: string
  tripId?: string
  quoteId?: string
  title: string
  status?: string
  signedAt?: string
  fileUrl?: string
  notes: string
}) {
  const actor = await getContractActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem criar contratos." }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo do contrato." }
  }

  const resolvedClient = await validateWorkspaceLink(actor, "clients", clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const resolvedTrip = await validateWorkspaceLink(actor, "trips", tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const resolvedQuote = await validateWorkspaceLink(actor, "quotes", quoteId)
  if ("error" in resolvedQuote) {
    return { error: resolvedQuote.error }
  }

  const { data, error } = await actor.adminClient
    .from("contracts")
    .insert({
      workspace_id: actor.workspaceId,
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      quote_id: resolvedQuote.id,
      title: trimmedTitle,
      status: normalizeContractStatus(status ?? "draft"),
      signed_at: signedAt || null,
      file_url: fileUrl?.trim() || null,
      notes: notes.trim() || null,
      created_by: actor.actorId,
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar o contrato." }
  }

  return { success: true, contractId: data.id }
}

export async function updateContractAction({
  contractId,
  clientId,
  tripId,
  quoteId,
  title,
  status,
  signedAt,
  fileUrl,
  notes,
}: {
  contractId: string
  clientId?: string
  tripId?: string
  quoteId?: string
  title: string
  status: string
  signedAt?: string
  fileUrl?: string
  notes: string
}) {
  const actor = await getContractActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar contratos." }
  }

  const resolvedContract = await resolveContractForActor(actor, contractId)
  if ("error" in resolvedContract) {
    return { error: resolvedContract.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo do contrato." }
  }

  const resolvedClient = await validateWorkspaceLink(actor, "clients", clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const resolvedTrip = await validateWorkspaceLink(actor, "trips", tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const resolvedQuote = await validateWorkspaceLink(actor, "quotes", quoteId)
  if ("error" in resolvedQuote) {
    return { error: resolvedQuote.error }
  }

  const { error } = await actor.adminClient
    .from("contracts")
    .update({
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      quote_id: resolvedQuote.id,
      title: trimmedTitle,
      status: normalizeContractStatus(status),
      signed_at: signedAt || null,
      file_url: fileUrl?.trim() || null,
      notes: notes.trim() || null,
    })
    .eq("id", contractId)

  if (error) {
    return { error: error.message }
  }

  return { success: true, contractId: resolvedContract.contract.id }
}
