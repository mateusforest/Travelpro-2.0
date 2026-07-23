"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { logWorkspaceActivity } from "@/lib/activity/log"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type SupportTicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed"
export type SupportTicketPriority = "low" | "medium" | "high" | "urgent"

type SupportTicketRow = {
  id: string
  workspace_id: string
  user_id: string
  category: string
  subject: string
  description: string
  priority: SupportTicketPriority
  status: SupportTicketStatus
  assigned_to: string | null
  created_at: string
  updated_at: string
}

type SupportMessageRow = {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  created_at: string
}

type WorkspaceNameRow = {
  id: string
  name: string | null
}

type ProfileNameRow = {
  id: string
  full_name: string | null
  email: string | null
}

type SupportActor = {
  actorId: string
  workspaceId: string | null
  isMaster: boolean
  canManageWorkspace: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

function normalizePriorityLabel(priority: string): SupportTicketPriority {
  const normalized = priority.trim().toLowerCase()

  if (normalized === "low" || normalized === "baixa") return "low"
  if (normalized === "high" || normalized === "alta") return "high"
  if (normalized === "urgent" || normalized === "urgente") return "urgent"
  return "medium"
}

function logSupportError(step: string, details: string) {
  console.error(`[support] ${step}: ${details}`)
}

async function getSupportActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para o suporte." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace?.id ?? null,
    isMaster: access.profile?.global_role === "master",
    canManageWorkspace: canManageWorkspace(access),
    adminClient,
  } satisfies SupportActor
}

async function resolveTicketForActor(ticketId: string, actor: SupportActor) {
  const { data: ticket, error } = await actor.adminClient
    .from("support_tickets")
    .select("id, workspace_id, user_id, category, subject, description, priority, status, assigned_to, created_at, updated_at")
    .eq("id", ticketId)
    .maybeSingle<SupportTicketRow>()

  if (error) {
    return { error: error.message }
  }

  if (!ticket) {
    return { error: "Chamado não encontrado." }
  }

  if (!actor.isMaster && ticket.workspace_id !== actor.workspaceId) {
    return { error: "Você não tem permissão para acessar este chamado." }
  }

  return { ticket }
}

async function enrichTickets(adminClient: SupportActor["adminClient"], tickets: SupportTicketRow[]) {
  const workspaceIds = Array.from(new Set(tickets.map((ticket) => ticket.workspace_id).filter(Boolean)))
  const userIds = Array.from(
    new Set(
      tickets
        .flatMap((ticket) => [ticket.user_id, ticket.assigned_to])
        .filter((value): value is string => Boolean(value)),
    ),
  )

  const [{ data: workspaces }, { data: profiles }] = await Promise.all([
    workspaceIds.length > 0
      ? adminClient.from("workspaces").select("id, name").in("id", workspaceIds).returns<WorkspaceNameRow[]>()
      : Promise.resolve({ data: [] as WorkspaceNameRow[] }),
    userIds.length > 0
      ? adminClient.from("profiles").select("id, full_name, email").in("id", userIds).returns<ProfileNameRow[]>()
      : Promise.resolve({ data: [] as ProfileNameRow[] }),
  ])

  const workspaceMap = new Map((workspaces ?? []).map((workspace) => [workspace.id, workspace]))
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return tickets.map((ticket) => {
    const requester = profileMap.get(ticket.user_id)
    const assignee = ticket.assigned_to ? profileMap.get(ticket.assigned_to) : null
    const workspace = workspaceMap.get(ticket.workspace_id)

    return {
      id: ticket.id,
      workspaceId: ticket.workspace_id,
      userId: ticket.user_id,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assigned_to,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      workspaceName: workspace?.name || "Workspace sem nome",
      userName: requester?.full_name || requester?.email || "Usuário sem nome",
      userEmail: requester?.email || "",
      assigneeName: assignee?.full_name || assignee?.email || "",
    }
  })
}

async function enrichMessages(adminClient: SupportActor["adminClient"], messages: SupportMessageRow[]) {
  const senderIds = Array.from(new Set(messages.map((message) => message.sender_id).filter(Boolean)))
  const { data: profiles } =
    senderIds.length > 0
      ? await adminClient.from("profiles").select("id, full_name, email").in("id", senderIds).returns<ProfileNameRow[]>()
      : { data: [] as ProfileNameRow[] }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return messages.map((message) => {
    const sender = profileMap.get(message.sender_id)
    return {
      id: message.id,
      ticketId: message.ticket_id,
      senderId: message.sender_id,
      message: message.message,
      createdAt: message.created_at,
      senderName: sender?.full_name || sender?.email || "Equipe COS",
      senderEmail: sender?.email || "",
    }
  })
}

export async function createSupportTicketAction({
  category,
  subject,
  description,
  priority,
}: {
  category: string
  subject: string
  description: string
  priority: string
}) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.workspaceId) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  const trimmedSubject = subject.trim()
  const trimmedDescription = description.trim()

  if (!trimmedSubject) {
    return { error: "Informe o assunto do chamado." }
  }

  if (!trimmedDescription) {
    return { error: "Descreva o que você precisa." }
  }

  const { data: ticket, error: ticketError } = await actor.adminClient
    .from("support_tickets")
    .insert({
      workspace_id: actor.workspaceId,
      user_id: actor.actorId,
      category: category.trim(),
      subject: trimmedSubject,
      description: trimmedDescription,
      priority: normalizePriorityLabel(priority),
      status: "open",
    })
    .select("id, workspace_id, user_id, category, subject, description, priority, status, assigned_to, created_at, updated_at")
    .single<SupportTicketRow>()

  if (ticketError || !ticket) {
    logSupportError("ticket-create", ticketError?.message ?? "ticket vazio")
    return { error: ticketError?.message ?? "Não foi possível criar o chamado." }
  }

  const { error: messageError } = await actor.adminClient.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: actor.actorId,
    message: trimmedDescription,
  })

  if (messageError) {
    logSupportError("first-message", messageError.message)
    return { error: messageError.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "support",
    action: "support_ticket_created",
    description: "chamado criado",
  })

  return {
    success: true,
    ticketId: ticket.id,
    message: "Chamado criado com sucesso.",
  }
}

export async function getSupportTicketsAction({ scope = "workspace" }: { scope?: "workspace" | "all" } = {}) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (scope === "all" && !actor.isMaster) {
    return { error: "Você não tem permissão para visualizar todos os chamados." }
  }

  if (scope === "workspace" && !actor.workspaceId) {
    return { success: true, tickets: [] as Awaited<ReturnType<typeof enrichTickets>> }
  }

  let query = actor.adminClient
    .from("support_tickets")
    .select("id, workspace_id, user_id, category, subject, description, priority, status, assigned_to, created_at, updated_at")
    .order("updated_at", { ascending: false })

  if (scope === "workspace") {
    query = query.eq("workspace_id", actor.workspaceId as string)
  }

  const { data: tickets, error } = await query.returns<SupportTicketRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    tickets: await enrichTickets(actor.adminClient, tickets ?? []),
  }
}

export async function getSupportTicketMessagesAction({ ticketId }: { ticketId: string }) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveTicketForActor(ticketId, actor)

  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { data: messages, error } = await actor.adminClient
    .from("support_messages")
    .select("id, ticket_id, sender_id, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .returns<SupportMessageRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    ticket: resolved.ticket,
    messages: await enrichMessages(actor.adminClient, messages ?? []),
  }
}

export async function addSupportMessageAction({
  ticketId,
  message,
}: {
  ticketId: string
  message: string
}) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveTicketForActor(ticketId, actor)

  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedMessage = message.trim()

  if (!trimmedMessage) {
    return { error: "Escreva uma mensagem para continuar." }
  }

  const { error: messageError } = await actor.adminClient.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: actor.actorId,
    message: trimmedMessage,
  })

  if (messageError) {
    logSupportError("message-create", messageError.message)
    return { error: messageError.message }
  }

  const nextStatus =
    actor.isMaster && resolved.ticket.status === "open"
      ? "in_progress"
      : resolved.ticket.status

  const { error: ticketError } = await actor.adminClient
    .from("support_tickets")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)

  if (ticketError) {
    logSupportError("ticket-touch", ticketError.message)
    return { error: ticketError.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: resolved.ticket.workspace_id,
    userId: actor.actorId,
    area: "support",
    action: actor.isMaster ? "master_support_reply" : "support_message_created",
    description: actor.isMaster ? "resposta enviada pela equipe master" : "mensagem de suporte criada",
  })

  return { success: true }
}

export async function updateSupportTicketStatusAction({
  ticketId,
  status,
}: {
  ticketId: string
  status: SupportTicketStatus
}) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.isMaster) {
    return { error: "Somente a equipe master pode alterar o status do chamado." }
  }

  const resolved = await resolveTicketForActor(ticketId, actor)

  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("support_tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: resolved.ticket.workspace_id,
    userId: actor.actorId,
    area: "support",
    action: "support_status_updated",
    description: `status alterado para ${status}`,
  })

  return { success: true }
}

export async function updateSupportTicketPriorityAction({
  ticketId,
  priority,
}: {
  ticketId: string
  priority: SupportTicketPriority
}) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.isMaster) {
    return { error: "Somente a equipe master pode alterar a prioridade do chamado." }
  }

  const resolved = await resolveTicketForActor(ticketId, actor)

  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("support_tickets")
    .update({
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: resolved.ticket.workspace_id,
    userId: actor.actorId,
    area: "support",
    action: "support_priority_updated",
    description: `prioridade alterada para ${priority}`,
  })

  return { success: true }
}

export async function assignSupportTicketAction({
  ticketId,
  assigneeId,
}: {
  ticketId: string
  assigneeId: string | null
}) {
  const actor = await getSupportActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.isMaster) {
    return { error: "Somente a equipe master pode atribuir chamados." }
  }

  const resolved = await resolveTicketForActor(ticketId, actor)

  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("support_tickets")
    .update({
      assigned_to: assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: resolved.ticket.workspace_id,
    userId: actor.actorId,
    area: "support",
    action: "support_ticket_assigned",
    description: assigneeId ? "chamado atribuído" : "atribuição removida",
  })

  return { success: true }
}
