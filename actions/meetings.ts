"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { logWorkspaceActivity } from "@/lib/activity/log"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type MeetingStatus = "draft" | "recorded" | "transcribed" | "archived"

type MeetingRow = {
  id: string
  workspace_id: string
  title: string
  audio_url: string | null
  transcript: string | null
  summary: string | null
  decisions: string | null
  next_steps: string | null
  status: string | null
  created_by: string | null
  created_at: string | null
}

type MeetingActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getMeetingActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para reuniões." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies MeetingActor
}

function normalizeMeetingStatus(status: string): MeetingStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "recorded" || normalized === "gravada" || normalized === "gravado") return "recorded"
  if (normalized === "transcribed" || normalized === "transcrita" || normalized === "transcrito") return "transcribed"
  if (normalized === "archived" || normalized === "arquivada" || normalized === "arquivado") return "archived"
  return "draft"
}

async function resolveMeetingForActor(actor: MeetingActor, meetingId: string) {
  const { data, error } = await actor.adminClient
    .from("meetings")
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .eq("id", meetingId)
    .maybeSingle<MeetingRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Reunião não encontrada neste workspace." }
  }

  return { meeting: data }
}

export async function getMeetingsAction() {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("meetings")
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<MeetingRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    meetings: (data ?? []).map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      audioUrl: meeting.audio_url || "",
      transcript: meeting.transcript || "",
      summary: meeting.summary || "",
      decisions: meeting.decisions || "",
      nextSteps: meeting.next_steps || "",
      status: normalizeMeetingStatus(meeting.status ?? "draft"),
      createdAt: meeting.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getMeetingByIdAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  return {
    success: true,
    meeting: {
      id: resolved.meeting.id,
      title: resolved.meeting.title,
      audioUrl: resolved.meeting.audio_url || "",
      transcript: resolved.meeting.transcript || "",
      summary: resolved.meeting.summary || "",
      decisions: resolved.meeting.decisions || "",
      nextSteps: resolved.meeting.next_steps || "",
      status: normalizeMeetingStatus(resolved.meeting.status ?? "draft"),
      createdAt: resolved.meeting.created_at,
    },
  }
}

export async function createMeetingAction({
  title,
  audioUrl,
  transcript,
  summary,
  decisions,
  nextSteps,
  status,
}: {
  title: string
  audioUrl?: string
  transcript?: string
  summary?: string
  decisions?: string
  nextSteps?: string
  status?: string
}) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o título da reunião." }
  }

  const { data, error } = await actor.adminClient
    .from("meetings")
    .insert({
      workspace_id: actor.workspaceId,
      title: trimmedTitle,
      audio_url: audioUrl?.trim() || null,
      transcript: transcript?.trim() || null,
      summary: summary?.trim() || null,
      decisions: decisions?.trim() || null,
      next_steps: nextSteps?.trim() || null,
      status: normalizeMeetingStatus(status ?? "draft"),
      created_by: actor.actorId,
    })
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .single<MeetingRow>()

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a reunião." }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "meetings",
    action: "meeting_created",
    description: "reunião criada",
  })

  return { success: true, meetingId: data.id }
}

export async function updateMeetingAction({
  meetingId,
  title,
  audioUrl,
  transcript,
  summary,
  decisions,
  nextSteps,
  status,
}: {
  meetingId: string
  title: string
  audioUrl?: string
  transcript?: string
  summary?: string
  decisions?: string
  nextSteps?: string
  status: string
}) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar reuniões." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o título da reunião." }
  }

  const { error } = await actor.adminClient
    .from("meetings")
    .update({
      title: trimmedTitle,
      audio_url: audioUrl?.trim() || null,
      transcript: transcript?.trim() || null,
      summary: summary?.trim() || null,
      decisions: decisions?.trim() || null,
      next_steps: nextSteps?.trim() || null,
      status: normalizeMeetingStatus(status),
    })
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "meetings",
    action: "meeting_updated",
    description: "reunião atualizada",
  })

  return { success: true }
}

export async function deleteMeetingAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem arquivar reuniões." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("meetings")
    .update({
      status: "archived",
    })
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "meetings",
    action: "meeting_archived",
    description: "reunião arquivada",
  })

  return { success: true }
}
