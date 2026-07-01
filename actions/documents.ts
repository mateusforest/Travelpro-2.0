"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type DocumentStatus = "draft" | "sent" | "signed" | "archived"
export type DocumentType = "contrato" | "arquivo" | "relatorio" | "proposta" | "outro"

type DocumentRow = {
  id: string
  workspace_id: string
  client_id: string | null
  trip_id: string | null
  quote_id: string | null
  contract_id: string | null
  title: string
  type: string | null
  file_url: string | null
  content: string | null
  status: string | null
  created_by: string | null
  created_at: string | null
}

type WorkspaceLookupRow = {
  id: string
  workspace_id: string
}

type DocumentActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getDocumentActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para documentos." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies DocumentActor
}

function normalizeDocumentStatus(status: string): DocumentStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "sent" || normalized === "enviado") return "sent"
  if (normalized === "signed" || normalized === "assinado") return "signed"
  if (normalized === "archived" || normalized === "arquivado") return "archived"
  return "draft"
}

function normalizeDocumentType(type: string): DocumentType {
  const normalized = type.trim().toLowerCase()
  if (normalized === "contrato") return "contrato"
  if (normalized === "arquivo") return "arquivo"
  if (normalized === "relatorio" || normalized === "relatorio") return "relatorio"
  if (normalized === "proposta") return "proposta"
  return "outro"
}

async function logDocumentActivity({
  adminClient,
  workspaceId,
  userId,
  action,
  description,
}: {
  adminClient: DocumentActor["adminClient"]
  workspaceId: string
  userId: string
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area: "documents",
    action,
    description,
  })

  if (error) {
    console.error("[documents] activity-log:", error.message)
  }
}

async function resolveDocumentForActor(actor: DocumentActor, documentId: string) {
  const { data, error } = await actor.adminClient
    .from("documents")
    .select("id, workspace_id, client_id, trip_id, quote_id, contract_id, title, type, file_url, content, status, created_by, created_at")
    .eq("id", documentId)
    .maybeSingle<DocumentRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Documento nao encontrado neste workspace." }
  }

  return { document: data }
}

async function validateWorkspaceLink(
  actor: DocumentActor,
  table: "clients" | "trips" | "quotes" | "contracts",
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
    const label =
      table === "clients" ? "Cliente" : table === "trips" ? "Viagem" : table === "quotes" ? "Cotacao" : "Contrato"
    return { error: `${label} nao encontrado neste workspace.` }
  }

  return { id: data.id }
}

export async function getDocumentsAction() {
  const actor = await getDocumentActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("documents")
    .select("id, workspace_id, client_id, trip_id, quote_id, contract_id, title, type, file_url, content, status, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    documents: (data ?? []).map((document) => ({
      id: document.id,
      clientId: document.client_id,
      tripId: document.trip_id,
      quoteId: document.quote_id,
      contractId: document.contract_id,
      title: document.title,
      type: normalizeDocumentType(document.type ?? "outro"),
      fileUrl: document.file_url || "",
      content: document.content || "",
      status: normalizeDocumentStatus(document.status ?? "draft"),
      createdAt: document.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getDocumentByIdAction({ documentId }: { documentId: string }) {
  const actor = await getDocumentActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveDocumentForActor(actor, documentId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  return {
    success: true,
    document: {
      id: resolved.document.id,
      clientId: resolved.document.client_id,
      tripId: resolved.document.trip_id,
      quoteId: resolved.document.quote_id,
      contractId: resolved.document.contract_id,
      title: resolved.document.title,
      type: normalizeDocumentType(resolved.document.type ?? "outro"),
      fileUrl: resolved.document.file_url || "",
      content: resolved.document.content || "",
      status: normalizeDocumentStatus(resolved.document.status ?? "draft"),
      createdAt: resolved.document.created_at,
    },
  }
}

export async function createDocumentAction({
  clientId,
  tripId,
  quoteId,
  contractId,
  title,
  type,
  fileUrl,
  content,
  status,
}: {
  clientId?: string
  tripId?: string
  quoteId?: string
  contractId?: string
  title: string
  type?: string
  fileUrl?: string
  content: string
  status?: string
}) {
  const actor = await getDocumentActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo do documento." }
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

  const resolvedContract = await validateWorkspaceLink(actor, "contracts", contractId)
  if ("error" in resolvedContract) {
    return { error: resolvedContract.error }
  }

  const { data, error } = await actor.adminClient
    .from("documents")
    .insert({
      workspace_id: actor.workspaceId,
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      quote_id: resolvedQuote.id,
      contract_id: resolvedContract.id,
      title: trimmedTitle,
      type: normalizeDocumentType(type ?? "outro"),
      file_url: fileUrl?.trim() || null,
      content: content.trim() || null,
      status: normalizeDocumentStatus(status ?? "draft"),
      created_by: actor.actorId,
    })
    .select("id, workspace_id, client_id, trip_id, quote_id, contract_id, title, type, file_url, content, status, created_by, created_at")
    .single<DocumentRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar o documento." }
  }

  await logDocumentActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "document_created",
    description: "documento criado",
  })

  return { success: true, documentId: data.id }
}

export async function updateDocumentAction({
  documentId,
  clientId,
  tripId,
  quoteId,
  contractId,
  title,
  type,
  fileUrl,
  content,
  status,
}: {
  documentId: string
  clientId?: string
  tripId?: string
  quoteId?: string
  contractId?: string
  title: string
  type: string
  fileUrl?: string
  content: string
  status: string
}) {
  const actor = await getDocumentActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar documentos." }
  }

  const resolved = await resolveDocumentForActor(actor, documentId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo do documento." }
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

  const resolvedContract = await validateWorkspaceLink(actor, "contracts", contractId)
  if ("error" in resolvedContract) {
    return { error: resolvedContract.error }
  }

  const { error } = await actor.adminClient
    .from("documents")
    .update({
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      quote_id: resolvedQuote.id,
      contract_id: resolvedContract.id,
      title: trimmedTitle,
      type: normalizeDocumentType(type),
      file_url: fileUrl?.trim() || null,
      content: content.trim() || null,
      status: normalizeDocumentStatus(status),
    })
    .eq("id", documentId)

  if (error) {
    return { error: error.message }
  }

  await logDocumentActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "document_updated",
    description: "documento atualizado",
  })

  return { success: true }
}

export async function deleteDocumentAction({ documentId }: { documentId: string }) {
  const actor = await getDocumentActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem arquivar documentos." }
  }

  const resolved = await resolveDocumentForActor(actor, documentId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("documents")
    .update({
      status: "archived",
    })
    .eq("id", documentId)

  if (error) {
    return { error: error.message }
  }

  await logDocumentActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "document_archived",
    description: "documento arquivado",
  })

  return { success: true }
}
