"use server"

import { humanizeActivityAction } from "@/lib/activity/humanize"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"

type MasterActor = {
  actorId: string
  profileName: string | null
  profileEmail: string | null
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

type WorkspaceRow = {
  id: string
  name: string | null
  type: "operations" | null
  owner_id: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  global_role: string | null
  created_at: string | null
}

type WorkspaceMemberRow = {
  workspace_id: string
  user_id: string
  role: string | null
}

type ActivityLogRow = {
  id: string
  workspace_id?: string | null
  user_id?: string | null
  area?: string | null
  action?: string | null
  description?: string | null
  created_at?: string | null
}

type MasterOverviewStats = {
  activeClients: number
  activeWorkspaces: number
  totalUsers: number
  monthlyRevenue: number
  monthlyRevenueLabel: string
  aiUsageTokens: number
  openSupportTickets: number
  activeIntegrations: number
}

function formatMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

async function requireMasterActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (access.profile?.global_role !== "master") {
    return { error: "Acesso restrito a equipe master." as const }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para o painel master." as const }
  }

  return {
    actorId: authData.user.id,
    profileName: access.profile?.full_name || null,
    profileEmail: access.profile?.email || authData.user.email || null,
    adminClient,
  } satisfies MasterActor
}

function toCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function normalizeWorkspaceType(value: string | null | undefined) {
  if (value === "operations") return "Operacoes"
  return "-"
}

function humanizeMasterActivityAction(action: string | null | undefined) {
  const normalized = (action || "activity_logged").trim().toLowerCase()

  const labels: Record<string, string> = {
    financial_entry_created: "Lançamento financeiro criado",
    financial_entry_updated: "Lançamento financeiro atualizado",
    financial_entry_deleted: "Lançamento financeiro removido",
    client_created: "Cliente criado",
    client_updated: "Cliente atualizado",
    client_archived: "Cliente arquivado",
    support_ticket_created: "Chamado de suporte aberto",
    support_message_created: "Mensagem enviada no suporte",
    master_support_reply: "Resposta enviada no suporte",
    meeting_created: "Reunião criada",
    meeting_updated: "Reunião atualizada",
    meeting_archived: "Reunião arquivada",
    document_created: "Documento criado",
    document_updated: "Documento atualizado",
    document_archived: "Documento arquivado",
    operation_created: "Operação criada",
    operation_updated: "Operação atualizada",
    operation_archived: "Operação arquivada",
  }

  if (labels[normalized]) {
    return labels[normalized]
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function classifyMasterActivity({
  action,
  area,
  description,
}: {
  action: string | null | undefined
  area: string | null | undefined
  description: string | null | undefined
}) {
  const normalizedAction = (action || "").toLowerCase()
  const normalizedArea = (area || "").toLowerCase()
  const normalizedDescription = (description || "").toLowerCase()
  const combined = `${normalizedAction} ${normalizedArea} ${normalizedDescription}`

  if (combined.includes("user") || combined.includes("usuario") || combined.includes("profile") || combined.includes("member")) {
    return "Usuário"
  }

  if (
    combined.includes("subscription") ||
    combined.includes("assinatura") ||
    combined.includes("invoice") ||
    combined.includes("billing") ||
    combined.includes("cobranca") ||
    combined.includes("payment") ||
    combined.includes("stripe")
  ) {
    return "Assinatura"
  }

  if (combined.includes("workspace")) {
    return "Workspace"
  }

  return "Sistema"
}

async function loadMasterActivityRows(actor: MasterActor, limit: number) {
  return actor.adminClient
    .from("activity_logs")
    .select("id, workspace_id, user_id, area, action, description, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ActivityLogRow[]>()
}

function mapMasterActivities({
  logs,
  workspaceMap,
  profileMap,
}: {
  logs: ActivityLogRow[]
  workspaceMap: Map<string, string>
  profileMap?: Map<string, string>
}) {
  return logs.map((log) => ({
    id: log.id,
    action: log.action || "activity_logged",
    actionLabel: humanizeActivityAction(log.action, log.description),
    category: classifyMasterActivity({
      action: log.action ?? null,
      area: log.area ?? null,
      description: log.description ?? null,
    }),
    description: log.description || "Atividade registrada.",
    actorName: log.user_id ? profileMap?.get(log.user_id) || "Sistema COS" : "Sistema COS",
    workspaceName: log.workspace_id ? workspaceMap.get(log.workspace_id) || "Workspace sem nome" : "",
    createdAt: log.created_at || null,
  }))
}

export async function getMasterDashboardStatsAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { start, end } = formatMonthBounds()

  const [
    workspacesResult,
    profilesResult,
    openTicketsResult,
    aiUsageResult,
    invoicesResult,
  ] = await Promise.all([
    actor.adminClient.from("workspaces").select("id", { count: "exact", head: true }),
    actor.adminClient.from("profiles").select("id", { count: "exact", head: true }),
    actor.adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting"]),
    actor.adminClient.from("ai_usage_logs").select("total_tokens"),
    actor.adminClient.from("invoices").select("status, paid_at, created_at, amount, amount_paid, total"),
  ])

  const workspaceCount = workspacesResult.count ?? 0
  const usersCount = profilesResult.count ?? 0
  const openTicketsCount = openTicketsResult.count ?? 0

  const monthlyInvoices = (Array.isArray(invoicesResult.data) ? invoicesResult.data : []).filter((invoice) => {
    const status = typeof invoice.status === "string" ? invoice.status.toLowerCase() : ""
    const paidAt = typeof invoice.paid_at === "string" ? invoice.paid_at : typeof invoice.created_at === "string" ? invoice.created_at : null

    if (!paidAt) {
      return false
    }

    return status === "paid" && paidAt >= start && paidAt < end
  })

  const monthlyRevenue = monthlyInvoices.reduce((sum, invoice) => {
    const amount =
      typeof invoice.amount === "number"
        ? invoice.amount
        : typeof invoice.amount_paid === "number"
          ? invoice.amount_paid
          : typeof invoice.total === "number"
            ? invoice.total
            : 0

    return sum + amount
  }, 0)

  const totalTokens = (Array.isArray(aiUsageResult.data) ? aiUsageResult.data : []).reduce((sum, log) => {
    return sum + (typeof log.total_tokens === "number" ? log.total_tokens : 0)
  }, 0)

  return {
    success: true,
    stats: {
      activeClients: workspaceCount,
      activeWorkspaces: workspaceCount,
      totalUsers: usersCount,
      monthlyRevenue,
      monthlyRevenueLabel: toCurrencyBRL(monthlyRevenue),
      aiUsageTokens: totalTokens,
      openSupportTickets: openTicketsCount,
      activeIntegrations: 0,
    },
  }
}

export async function getMasterRecentActivityAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const logsResult = await loadMasterActivityRows(actor, 8)

  if (logsResult.error) {
    return { error: logsResult.error.message }
  }

  const logs = logsResult.data ?? []
  const workspaceIds = Array.from(new Set(logs.map((log) => log.workspace_id).filter((value): value is string => Boolean(value))))
  const workspaceResult =
    workspaceIds.length > 0
      ? await actor.adminClient.from("workspaces").select("id, name").in("id", workspaceIds)
      : { data: [] as { id: string; name: string | null }[] }

  const workspaceMap = new Map((workspaceResult.data ?? []).map((workspace) => [workspace.id, workspace.name || "Workspace sem nome"]))

  return {
    success: true,
    activities: mapMasterActivities({
      logs,
      workspaceMap,
    }),
  }
}

export async function getMasterOverviewAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { start, end } = formatMonthBounds()

  const [
    workspacesResult,
    profilesResult,
    openTicketsResult,
    aiUsageResult,
    invoicesResult,
    logsResult,
    membersResult,
  ] = await Promise.all([
    actor.adminClient.from("workspaces").select("id, name, type, owner_id, created_at", { count: "exact" }).returns<WorkspaceRow[]>(),
    actor.adminClient.from("profiles").select("id", { count: "exact", head: true }),
    actor.adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting"]),
    actor.adminClient.from("ai_usage_logs").select("total_tokens"),
    actor.adminClient.from("invoices").select("status, paid_at, created_at, amount, amount_paid, total"),
    loadMasterActivityRows(actor, 8),
    actor.adminClient.from("workspace_members").select("workspace_id, user_id, role").returns<WorkspaceMemberRow[]>(),
  ])

  const error =
    workspacesResult.error ||
    profilesResult.error ||
    openTicketsResult.error ||
    aiUsageResult.error  ||
    invoicesResult.error ||
    logsResult.error ||
    membersResult.error

  if (error) {
    return { error: error.message }
  }

  const workspaces = workspacesResult.data ?? []
  const members = membersResult.data ?? []
  const logs = logsResult.data ?? []

  const monthlyInvoices = (Array.isArray(invoicesResult.data) ? invoicesResult.data : []).filter((invoice) => {
    const status = typeof invoice.status === "string" ? invoice.status.toLowerCase() : ""
    const paidAt = typeof invoice.paid_at === "string" ? invoice.paid_at : typeof invoice.created_at === "string" ? invoice.created_at : null

    if (!paidAt) {
      return false
    }

    return status === "paid" && paidAt >= start && paidAt < end
  })

  const monthlyRevenue = monthlyInvoices.reduce((sum, invoice) => {
    const amount =
      typeof invoice.amount === "number"
        ? invoice.amount
        : typeof invoice.amount_paid === "number"
          ? invoice.amount_paid
          : typeof invoice.total === "number"
            ? invoice.total
            : 0

    return sum + amount
  }, 0)

  const totalTokens = (Array.isArray(aiUsageResult.data) ? aiUsageResult.data : []).reduce((sum, log) => {
    return sum + (typeof log.total_tokens === "number" ? log.total_tokens : 0)
  }, 0)

  const workspaceMap = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const workspaceNameMap = new Map(workspaces.map((workspace) => [workspace.id, workspace.name || "Workspace sem nome"]))
  const memberCounts = new Map<string, number>()

  members.forEach((member) => {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  })

  const topClients = [...workspaces]
    .map((workspace) => ({
      name: workspace.name || "Workspace sem nome",
      type: normalizeWorkspaceType(workspace.type),
      status: "Ativo",
      users: memberCounts.get(workspace.id) ?? 0,
    }))
    .sort((left, right) => right.users - left.users)
    .slice(0, 5)

  return {
    success: true,
    overview: {
      stats: {
        activeClients: workspaces.length,
        activeWorkspaces: workspaces.length,
        totalUsers: profilesResult.count ?? 0,
        monthlyRevenue,
        monthlyRevenueLabel: toCurrencyBRL(monthlyRevenue),
        aiUsageTokens: totalTokens,
        openSupportTickets: openTicketsResult.count ?? 0,
        activeIntegrations: 0,
      } satisfies MasterOverviewStats,
      activities: mapMasterActivities({
        logs,
        workspaceMap: workspaceNameMap,
      }),
      topClients,
    },
  }
}

export async function getMasterClientsAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [{ data: workspaces, error: workspaceError }, { data: members, error: membersError }] = await Promise.all([
    actor.adminClient
      .from("workspaces")
      .select("id, name, type, owner_id, created_at")
      .order("created_at", { ascending: false })
      .returns<WorkspaceRow[]>(),
    actor.adminClient
      .from("workspace_members")
      .select("workspace_id, user_id, role")
      .returns<WorkspaceMemberRow[]>(),
  ])

  if (workspaceError) {
    return { error: workspaceError.message }
  }

  if (membersError) {
    return { error: membersError.message }
  }

  const memberCounts = new Map<string, number>()
  ;(members ?? []).forEach((member) => {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  })

  return {
    success: true,
    clients: (workspaces ?? []).map((workspace) => ({
      id: workspace.id,
      company: workspace.name || "Workspace sem nome",
      type: normalizeWorkspaceType(workspace.type),
      users: memberCounts.get(workspace.id) ?? 0,
      status: "Ativo",
      createdAt: workspace.created_at,
    })),
  }
}

export async function getMasterWorkspacesAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [{ data: workspaces, error: workspaceError }, { data: members, error: membersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      actor.adminClient
        .from("workspaces")
        .select("id, name, type, owner_id, created_at")
        .order("created_at", { ascending: false })
        .returns<WorkspaceRow[]>(),
      actor.adminClient
        .from("workspace_members")
        .select("workspace_id, user_id, role")
        .returns<WorkspaceMemberRow[]>(),
      actor.adminClient
        .from("profiles")
        .select("id, full_name, email, global_role, created_at")
        .returns<ProfileRow[]>(),
    ])

  if (workspaceError) return { error: workspaceError.message }
  if (membersError) return { error: membersError.message }
  if (profilesError) return { error: profilesError.message }

  const memberCounts = new Map<string, number>()
  ;(members ?? []).forEach((member) => {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  })

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return {
    success: true,
    workspaces: (workspaces ?? []).map((workspace) => {
      const owner = workspace.owner_id ? profileMap.get(workspace.owner_id) : null
      return {
        id: workspace.id,
        name: workspace.name || "Workspace sem nome",
        type: normalizeWorkspaceType(workspace.type),
        ownerName: owner?.full_name || owner?.email || "Sem owner",
        members: memberCounts.get(workspace.id) ?? 0,
        createdAt: workspace.created_at,
        status: "Ativo",
      }
    }),
  }
}

export async function getMasterUsersAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [{ data: profiles, error: profilesError }, { data: members, error: membersError }, { data: workspaces, error: workspacesError }] =
    await Promise.all([
      actor.adminClient
        .from("profiles")
        .select("id, full_name, email, global_role, created_at")
        .order("created_at", { ascending: false })
        .returns<ProfileRow[]>(),
      actor.adminClient
        .from("workspace_members")
        .select("workspace_id, user_id, role")
        .returns<WorkspaceMemberRow[]>(),
      actor.adminClient
        .from("workspaces")
        .select("id, name, type, owner_id, created_at")
        .returns<WorkspaceRow[]>(),
    ])

  if (profilesError) return { error: profilesError.message }
  if (membersError) return { error: membersError.message }
  if (workspacesError) return { error: workspacesError.message }

  const workspaceMap = new Map((workspaces ?? []).map((workspace) => [workspace.id, workspace]))
  const membershipsByUser = new Map<string, WorkspaceMemberRow[]>()

  ;(members ?? []).forEach((member) => {
    const current = membershipsByUser.get(member.user_id) ?? []
    current.push(member)
    membershipsByUser.set(member.user_id, current)
  })

  return {
    success: true,
    users: (profiles ?? []).map((profile) => {
      const userMemberships = membershipsByUser.get(profile.id) ?? []
      const workspaceNames = userMemberships
        .map((membership) => workspaceMap.get(membership.workspace_id)?.name || "Workspace sem nome")
        .filter(Boolean)

      return {
        id: profile.id,
        fullName: profile.full_name || profile.email || "Usuario sem nome",
        email: profile.email || "Sem e-mail",
        globalRole: profile.global_role || "user",
        workspaces: workspaceNames,
        createdAt: profile.created_at,
      }
    }),
  }
}

export async function getMasterTopClientsAction() {
  const clientsResult = await getMasterClientsAction()

  if (clientsResult.error) {
    return { error: clientsResult.error }
  }

  const topClients = [...(clientsResult.clients ?? [])]
    .sort((left, right) => right.users - left.users)
    .slice(0, 5)
    .map((client) => ({
      name: client.company,
      type: client.type,
      status: client.status,
      users: client.users,
    }))

  return {
    success: true,
    clients: topClients,
  }
}

export async function getMasterSettingsOverviewAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

  return {
    success: true,
    settings: {
      platformName: "COS",
      appUrl: supabaseUrl,
      environment,
      status: "Ativo",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      integrations: [
        { name: "Supabase", status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configurado" : "Nao configurado" },
        { name: "OpenAI", status: process.env.OPENAI_API_KEY ? "Configurado" : "Nao configurado" },
        { name: "Stripe", status: process.env.STRIPE_SECRET_KEY ? "Configurado" : "Nao configurado" },
        { name: "WhatsApp", status: "Em preparacao" },
        { name: "E-mail", status: "Em preparacao" },
      ],
      currentUser: {
        name: actor.profileName || actor.profileEmail || "Equipe COS",
        email: actor.profileEmail || "",
        role: "master",
      },
    },
  }
}

export async function getMasterAuditLogsAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [logsResult, workspacesResult, profilesResult] = await Promise.all([
    loadMasterActivityRows(actor, 250),
    actor.adminClient.from("workspaces").select("id, name").returns<{ id: string; name: string | null }[]>(),
    actor.adminClient.from("profiles").select("id, full_name, email").returns<{ id: string; full_name: string | null; email: string | null }[]>(),
  ])

  const error = logsResult.error || workspacesResult.error || profilesResult.error

  if (error) {
    return { error: error.message }
  }

  const workspaceMap = new Map((workspacesResult.data ?? []).map((workspace) => [workspace.id, workspace.name || "Workspace sem nome"]))
  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Sistema COS"]))

  return {
    success: true,
    logs: mapMasterActivities({
      logs: logsResult.data ?? [],
      workspaceMap,
      profileMap,
    }),
  }
}

