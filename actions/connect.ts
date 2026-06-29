"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { humanizeActivityAction } from "@/lib/activity/humanize"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type ConnectSourceStatus =
  | "not_configured"
  | "configured"
  | "connected"
  | "error"
  | "paused"

export type ConnectActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "send"
  | "import"
  | "export"
  | "report"
  | "custom"

type ConnectSourceRow = {
  id: string
  workspace_id: string
  name: string
  source_type: string | null
  status: string | null
  access_url: string | null
  config: Record<string, unknown> | null
  created_by: string | null
  created_at: string | null
}

type ConnectSectionRow = {
  id: string
  workspace_id: string
  source_id: string
  name: string
  description: string | null
  config: Record<string, unknown> | null
  created_at: string | null
}

type ConnectActionRow = {
  id: string
  workspace_id: string
  source_id: string
  name: string
  action_type: string | null
  config: Record<string, unknown> | null
  created_at: string | null
}

type ActivityLogRow = {
  id: string
  area: string | null
  action: string | null
  description: string | null
  created_at: string | null
}

type ConnectActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

function normalizeSourceStatus(status?: string): ConnectSourceStatus {
  const normalized = (status || "").trim().toLowerCase()
  if (normalized === "connected") return "connected"
  if (normalized === "error") return "error"
  if (normalized === "paused") return "paused"
  if (normalized === "configured") return "configured"
  return "not_configured"
}

function normalizeActionType(actionType?: string): ConnectActionType {
  const normalized = (actionType || "").trim().toLowerCase()
  if (normalized === "create") return "create"
  if (normalized === "update") return "update"
  if (normalized === "delete") return "delete"
  if (normalized === "send") return "send"
  if (normalized === "import") return "import"
  if (normalized === "export") return "export"
  if (normalized === "report") return "report"
  if (normalized === "custom") return "custom"
  return "read"
}

function toStatusLabel(status: ConnectSourceStatus) {
  if (status === "configured") return "Configurado"
  if (status === "connected") return "Conectado"
  if (status === "error") return "Erro"
  if (status === "paused") return "Pausado"
  return "Nao configurado"
}

function logConnectError(step: string, details: string) {
  console.error(`[connect] ${step}: ${details}`)
}

async function getConnectActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user, supabase)
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para o Connect." as const }
  }

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const isMaster = access.profile?.global_role === "master"

  if (!isMaster && access.workspace.type !== "connect") {
    return { error: "Apenas workspaces Connect podem usar esta area." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster,
    adminClient,
  } satisfies ConnectActor
}

async function logConnectActivity({
  adminClient,
  workspaceId,
  userId,
  action,
  description,
}: {
  adminClient: ConnectActor["adminClient"]
  workspaceId: string
  userId: string
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area: "connect",
    action,
    description,
  })

  if (error) {
    logConnectError("activity-log", error.message)
  }
}

async function resolveSourceForActor(actor: ConnectActor, sourceId: string) {
  const { data, error } = await actor.adminClient
    .from("connect_sources")
    .select("id, workspace_id, name, source_type, status, access_url, config, created_by, created_at")
    .eq("id", sourceId)
    .maybeSingle<ConnectSourceRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Fonte nao encontrada neste workspace." }
  }

  return { source: data }
}

async function resolveSectionForActor(actor: ConnectActor, sectionId: string) {
  const { data, error } = await actor.adminClient
    .from("connect_sections")
    .select("id, workspace_id, source_id, name, description, config, created_at")
    .eq("id", sectionId)
    .maybeSingle<ConnectSectionRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Sessao nao encontrada neste workspace." }
  }

  return { section: data }
}

async function resolveActionForActor(actor: ConnectActor, connectActionId: string) {
  const { data, error } = await actor.adminClient
    .from("connect_actions")
    .select("id, workspace_id, source_id, name, action_type, config, created_at")
    .eq("id", connectActionId)
    .maybeSingle<ConnectActionRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Acao nao encontrada neste workspace." }
  }

  return { connectAction: data }
}

function mapSourceRow(
  row: ConnectSourceRow,
  sections: ConnectSectionRow[],
  actions: ConnectActionRow[],
) {
  const status = normalizeSourceStatus(row.status ?? "not_configured")
  const sourceSections = sections.filter((section) => section.source_id === row.id)
  const sourceActions = actions.filter((connectAction) => connectAction.source_id === row.id)

  return {
    id: row.id,
    name: row.name,
    sourceType: row.source_type || "Outro",
    status,
    statusLabel: toStatusLabel(status),
    accessUrl: row.access_url || "",
    config: row.config ?? {},
    createdAt: row.created_at,
    sectionsCount: sourceSections.length,
    actionsCount: sourceActions.length,
    sections: sourceSections.map((section) => ({
      id: section.id,
      sourceId: section.source_id,
      name: section.name,
      description: section.description || "",
      config: section.config ?? {},
      createdAt: section.created_at,
    })),
    actions: sourceActions.map((connectAction) => ({
      id: connectAction.id,
      sourceId: connectAction.source_id,
      name: connectAction.name,
      actionType: normalizeActionType(connectAction.action_type ?? "read"),
      config: connectAction.config ?? {},
      createdAt: connectAction.created_at,
    })),
  }
}

export async function createConnectSourceAction({
  name,
  sourceType,
  status,
  accessUrl,
  config,
}: {
  name: string
  sourceType: string
  status?: string
  accessUrl?: string
  config?: Record<string, unknown>
}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: "Informe o nome da fonte." }
  }

  const nextStatus = normalizeSourceStatus(status ?? "configured")

  const { data, error } = await actor.adminClient
    .from("connect_sources")
    .insert({
      workspace_id: actor.workspaceId,
      name: trimmedName,
      source_type: sourceType.trim() || "Outro",
      status: nextStatus,
      access_url: accessUrl?.trim() || null,
      config: config ?? {},
      created_by: actor.actorId,
    })
    .select("id, workspace_id, name, source_type, status, access_url, config, created_by, created_at")
    .single<ConnectSourceRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a fonte." }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_source_created",
    description: `fonte criada: ${trimmedName}`,
  })

  return { success: true, sourceId: data.id }
}

export async function getConnectSourcesAction() {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [sourcesResult, sectionsResult, actionsResult] = await Promise.all([
    actor.adminClient
      .from("connect_sources")
      .select("id, workspace_id, name, source_type, status, access_url, config, created_by, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .returns<ConnectSourceRow[]>(),
    actor.adminClient
      .from("connect_sections")
      .select("id, workspace_id, source_id, name, description, config, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .returns<ConnectSectionRow[]>(),
    actor.adminClient
      .from("connect_actions")
      .select("id, workspace_id, source_id, name, action_type, config, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .returns<ConnectActionRow[]>(),
  ])

  const nextError = sourcesResult.error || sectionsResult.error || actionsResult.error

  if (nextError) {
    return { error: nextError.message }
  }

  const sources = (sourcesResult.data ?? []).map((row) =>
    mapSourceRow(row, sectionsResult.data ?? [], actionsResult.data ?? []),
  )

  return {
    success: true,
    sources,
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getConnectSourceByIdAction({ sourceId }: { sourceId: string }) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveSourceForActor(actor, sourceId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const [sectionsResult, actionsResult] = await Promise.all([
    actor.adminClient
      .from("connect_sections")
      .select("id, workspace_id, source_id, name, description, config, created_at")
      .eq("workspace_id", actor.workspaceId)
      .eq("source_id", sourceId)
      .order("created_at", { ascending: false })
      .returns<ConnectSectionRow[]>(),
    actor.adminClient
      .from("connect_actions")
      .select("id, workspace_id, source_id, name, action_type, config, created_at")
      .eq("workspace_id", actor.workspaceId)
      .eq("source_id", sourceId)
      .order("created_at", { ascending: false })
      .returns<ConnectActionRow[]>(),
  ])

  const nextError = sectionsResult.error || actionsResult.error

  if (nextError) {
    return { error: nextError.message }
  }

  return {
    success: true,
    source: mapSourceRow(resolved.source, sectionsResult.data ?? [], actionsResult.data ?? []),
  }
}

export async function updateConnectSourceAction({
  sourceId,
  name,
  sourceType,
  status,
  accessUrl,
  config,
}: {
  sourceId: string
  name: string
  sourceType: string
  status: string
  accessUrl?: string
  config?: Record<string, unknown>
}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar fontes." }
  }

  const resolved = await resolveSourceForActor(actor, sourceId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: "Informe o nome da fonte." }
  }

  const { error } = await actor.adminClient
    .from("connect_sources")
    .update({
      name: trimmedName,
      source_type: sourceType.trim() || "Outro",
      status: normalizeSourceStatus(status),
      access_url: accessUrl?.trim() || null,
      config: config ?? resolved.source.config ?? {},
    })
    .eq("id", sourceId)

  if (error) {
    return { error: error.message }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_source_updated",
    description: `fonte atualizada: ${trimmedName}`,
  })

  return { success: true }
}

export async function deleteConnectSourceAction({ sourceId }: { sourceId: string }) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem remover fontes." }
  }

  const resolved = await resolveSourceForActor(actor, sourceId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error: actionsError } = await actor.adminClient
    .from("connect_actions")
    .delete()
    .eq("source_id", sourceId)
    .eq("workspace_id", actor.workspaceId)

  if (actionsError) {
    return { error: actionsError.message }
  }

  const { error: sectionsError } = await actor.adminClient
    .from("connect_sections")
    .delete()
    .eq("source_id", sourceId)
    .eq("workspace_id", actor.workspaceId)

  if (sectionsError) {
    return { error: sectionsError.message }
  }

  const { error } = await actor.adminClient
    .from("connect_sources")
    .delete()
    .eq("id", sourceId)
    .eq("workspace_id", actor.workspaceId)

  if (error) {
    return { error: error.message }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_source_deleted",
    description: `fonte removida: ${resolved.source.name}`,
  })

  return { success: true }
}

export async function createConnectSectionAction({
  sourceId,
  name,
  description,
  config,
}: {
  sourceId: string
  name: string
  description?: string
  config?: Record<string, unknown>
}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const sourceResolved = await resolveSourceForActor(actor, sourceId)
  if ("error" in sourceResolved) {
    return { error: sourceResolved.error }
  }

  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: "Informe o nome da sessao." }
  }

  const { data, error } = await actor.adminClient
    .from("connect_sections")
    .insert({
      workspace_id: actor.workspaceId,
      source_id: sourceId,
      name: trimmedName,
      description: description?.trim() || null,
      config: config ?? {},
    })
    .select("id, workspace_id, source_id, name, description, config, created_at")
    .single<ConnectSectionRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a sessao." }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_section_created",
    description: `sessao criada: ${trimmedName}`,
  })

  return { success: true, sectionId: data.id }
}

export async function getConnectSectionsAction({ sourceId }: { sourceId?: string } = {}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  let query = actor.adminClient
    .from("connect_sections")
    .select("id, workspace_id, source_id, name, description, config, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })

  if (sourceId) {
    query = query.eq("source_id", sourceId)
  }

  const { data, error } = await query.returns<ConnectSectionRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    sections: (data ?? []).map((section) => ({
      id: section.id,
      sourceId: section.source_id,
      name: section.name,
      description: section.description || "",
      config: section.config ?? {},
      createdAt: section.created_at,
    })),
  }
}

export async function updateConnectSectionAction({
  sectionId,
  name,
  description,
  config,
}: {
  sectionId: string
  name: string
  description?: string
  config?: Record<string, unknown>
}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar sessoes." }
  }

  const resolved = await resolveSectionForActor(actor, sectionId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: "Informe o nome da sessao." }
  }

  const { error } = await actor.adminClient
    .from("connect_sections")
    .update({
      name: trimmedName,
      description: description?.trim() || null,
      config: config ?? resolved.section.config ?? {},
    })
    .eq("id", sectionId)

  if (error) {
    return { error: error.message }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_section_updated",
    description: `sessao atualizada: ${trimmedName}`,
  })

  return { success: true }
}

export async function deleteConnectSectionAction({ sectionId }: { sectionId: string }) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem remover sessoes." }
  }

  const resolved = await resolveSectionForActor(actor, sectionId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("connect_sections")
    .delete()
    .eq("id", sectionId)

  if (error) {
    return { error: error.message }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_section_deleted",
    description: `sessao removida: ${resolved.section.name}`,
  })

  return { success: true }
}

export async function createConnectActionAction({
  sourceId,
  name,
  actionType,
  config,
}: {
  sourceId: string
  name: string
  actionType: string
  config?: Record<string, unknown>
}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const sourceResolved = await resolveSourceForActor(actor, sourceId)
  if ("error" in sourceResolved) {
    return { error: sourceResolved.error }
  }

  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: "Informe o nome da acao." }
  }

  const { data, error } = await actor.adminClient
    .from("connect_actions")
    .insert({
      workspace_id: actor.workspaceId,
      source_id: sourceId,
      name: trimmedName,
      action_type: normalizeActionType(actionType),
      config: config ?? {},
    })
    .select("id, workspace_id, source_id, name, action_type, config, created_at")
    .single<ConnectActionRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a acao." }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_action_created",
    description: `acao criada: ${trimmedName}`,
  })

  return { success: true, connectActionId: data.id }
}

export async function getConnectActionsAction({ sourceId }: { sourceId?: string } = {}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  let query = actor.adminClient
    .from("connect_actions")
    .select("id, workspace_id, source_id, name, action_type, config, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })

  if (sourceId) {
    query = query.eq("source_id", sourceId)
  }

  const { data, error } = await query.returns<ConnectActionRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    actions: (data ?? []).map((connectAction) => ({
      id: connectAction.id,
      sourceId: connectAction.source_id,
      name: connectAction.name,
      actionType: normalizeActionType(connectAction.action_type ?? "read"),
      config: connectAction.config ?? {},
      createdAt: connectAction.created_at,
    })),
  }
}

export async function updateConnectActionAction({
  connectActionId,
  name,
  actionType,
  config,
}: {
  connectActionId: string
  name: string
  actionType: string
  config?: Record<string, unknown>
}) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar acoes." }
  }

  const resolved = await resolveActionForActor(actor, connectActionId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: "Informe o nome da acao." }
  }

  const { error } = await actor.adminClient
    .from("connect_actions")
    .update({
      name: trimmedName,
      action_type: normalizeActionType(actionType),
      config: config ?? resolved.connectAction.config ?? {},
    })
    .eq("id", connectActionId)

  if (error) {
    return { error: error.message }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_action_updated",
    description: `acao atualizada: ${trimmedName}`,
  })

  return { success: true }
}

export async function deleteConnectActionAction({ connectActionId }: { connectActionId: string }) {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem remover acoes." }
  }

  const resolved = await resolveActionForActor(actor, connectActionId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("connect_actions")
    .delete()
    .eq("id", connectActionId)

  if (error) {
    return { error: error.message }
  }

  await logConnectActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "connect_action_deleted",
    description: `acao removida: ${resolved.connectAction.name}`,
  })

  return { success: true }
}

export async function getConnectWorkspaceOverviewAction() {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [sourcesResult, sectionsResult, actionsResult] = await Promise.all([
    actor.adminClient
      .from("connect_sources")
      .select("id, workspace_id, name, source_type, status, access_url, config, created_by, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .returns<ConnectSourceRow[]>(),
    actor.adminClient
      .from("connect_sections")
      .select("id, workspace_id, source_id, name, description, config, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .returns<ConnectSectionRow[]>(),
    actor.adminClient
      .from("connect_actions")
      .select("id, workspace_id, source_id, name, action_type, config, created_at")
      .eq("workspace_id", actor.workspaceId)
      .order("created_at", { ascending: false })
      .returns<ConnectActionRow[]>(),
  ])

  const nextError = sourcesResult.error || sectionsResult.error || actionsResult.error
  if (nextError) {
    return { error: nextError.message }
  }

  const sources = (sourcesResult.data ?? []).map((row) =>
    mapSourceRow(row, sectionsResult.data ?? [], actionsResult.data ?? []),
  )

  return {
    success: true,
    overview: {
      sources,
      sections: (sectionsResult.data ?? []).map((section) => ({
        id: section.id,
        sourceId: section.source_id,
        name: section.name,
        description: section.description || "",
        config: section.config ?? {},
        createdAt: section.created_at,
      })),
      actions: (actionsResult.data ?? []).map((connectAction) => ({
        id: connectAction.id,
        sourceId: connectAction.source_id,
        name: connectAction.name,
        actionType: normalizeActionType(connectAction.action_type ?? "read"),
        config: connectAction.config ?? {},
        createdAt: connectAction.created_at,
      })),
      summary: {
        configuredSources: sources.filter((source) => source.status !== "not_configured").length,
        totalSources: sources.length,
        totalSections: sectionsResult.data?.length ?? 0,
        totalActions: actionsResult.data?.length ?? 0,
      },
      canManage: actor.canManage || actor.isMaster,
    },
  }
}

export async function getConnectHistoryAction() {
  const actor = await getConnectActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [logsResult, sourcesResult] = await Promise.all([
    actor.adminClient
      .from("activity_logs")
      .select("id, area, action, description, created_at")
      .eq("workspace_id", actor.workspaceId)
      .in("area", ["connect", "support"])
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ActivityLogRow[]>(),
    actor.adminClient
      .from("connect_sources")
      .select("id, workspace_id, name, source_type, status, access_url, config, created_by, created_at")
      .eq("workspace_id", actor.workspaceId)
      .returns<ConnectSourceRow[]>(),
  ])

  const nextError = logsResult.error || sourcesResult.error
  if (nextError) {
    return { error: nextError.message }
  }

  return {
    success: true,
    logs: (logsResult.data ?? []).map((log) => ({
      id: log.id,
      area: log.area || "connect",
      action: log.action || "activity_logged",
      actionLabel: humanizeActivityAction(log.action, log.description),
      description: log.description || "Atividade registrada.",
      createdAt: log.created_at,
    })),
    sources: (sourcesResult.data ?? []).map((source) => ({
      id: source.id,
      name: source.name,
    })),
  }
}
