"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type DocumentStatus = "draft" | "sent" | "signed" | "archived"
export type DocumentType = "contrato" | "arquivo" | "relatório" | "proposta" | "outro"

type DocumentRow = {
  id: string
  workspace_id: string
  title: string
  type: string | null
  file_url: string | null
  content: string | null
  status: string | null
  created_by: string | null
  created_at: string | null
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
    return { error: "Sessão inválida. Faça login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para documentos." as const }
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
  if (normalized === "relatório" || normalized === "relatorio") return "relatório"
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
    .select("id, workspace_id, title, type, file_url, content, status, created_by, created_at")
    .eq("id", documentId)
    .maybeSingle<DocumentRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Documento não encontrado neste workspace." }
  }

  return { document: data }
}

export async function getDocumentsAction() {
  const actor = await getDocumentActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("documents")
    .select("id, workspace_id, title, type, file_url, content, status, created_by, created_at")
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
  title,
  type,
  fileUrl,
  content,
  status,
}: {
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
    return { error: "Informe o título do documento." }
  }

  const { data, error } = await actor.adminClient
    .from("documents")
    .insert({
      workspace_id: actor.workspaceId,
      title: trimmedTitle,
      type: normalizeDocumentType(type ?? "outro"),
      file_url: fileUrl?.trim() || null,
      content: content.trim() || null,
      status: normalizeDocumentStatus(status ?? "draft"),
      created_by: actor.actorId,
    })
    .select("id, workspace_id, title, type, file_url, content, status, created_by, created_at")
    .single<DocumentRow>()

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o documento." }
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
  title,
  type,
  fileUrl,
  content,
  status,
}: {
  documentId: string
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
    return { error: "Informe o título do documento." }
  }

  const { error } = await actor.adminClient
    .from("documents")
    .update({
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
