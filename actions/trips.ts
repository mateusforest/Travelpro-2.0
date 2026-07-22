"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { logWorkspaceActivity } from "@/lib/activity/log"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type TripStatus = "draft" | "planning" | "confirmed" | "in_progress" | "completed" | "cancelled" | "archived"

type TripRow = {
  id: string
  workspace_id: string
  client_id: string | null
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  traveler_count: number | null
  status: TripStatus | string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

type ClientLookupRow = {
  id: string
  workspace_id: string
}

type TripActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getTripActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para viagens." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies TripActor
}

function normalizeTripStatus(status: string): TripStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "planning") return "planning"
  if (normalized === "confirmed") return "confirmed"
  if (normalized === "in_progress" || normalized === "em andamento") return "in_progress"
  if (normalized === "completed" || normalized === "concluida" || normalized === "concluído" || normalized === "concluido") return "completed"
  if (normalized === "cancelled" || normalized === "cancelada" || normalized === "cancelado") return "cancelled"
  if (normalized === "archived" || normalized === "arquivada" || normalized === "arquivado") return "archived"
  return "draft"
}

function normalizeTravelerCount(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
}

async function resolveTripForActor(actor: TripActor, tripId: string) {
  const { data, error } = await actor.adminClient
    .from("trips")
    .select("id, workspace_id, client_id, title, destination, start_date, end_date, traveler_count, status, notes, created_by, created_at")
    .eq("id", tripId)
    .maybeSingle<TripRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Viagem nao encontrada neste workspace." }
  }

  return { trip: data }
}

async function validateClientForWorkspace(actor: TripActor, clientId?: string) {
  const normalizedClientId = clientId?.trim()

  if (!normalizedClientId) {
    return { clientId: null as string | null }
  }

  const { data, error } = await actor.adminClient
    .from("clients")
    .select("id, workspace_id")
    .eq("id", normalizedClientId)
    .maybeSingle<ClientLookupRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Cliente nao encontrado neste workspace." }
  }

  return { clientId: data.id }
}

export async function getTripsAction() {
  const actor = await getTripActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("trips")
    .select("id, workspace_id, client_id, title, destination, start_date, end_date, traveler_count, status, notes, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<TripRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    trips: (data ?? []).map((trip) => ({
      id: trip.id,
      clientId: trip.client_id,
      title: trip.title,
      destination: trip.destination || "",
      startDate: trip.start_date,
      endDate: trip.end_date,
      travelerCount: typeof trip.traveler_count === "number" ? trip.traveler_count : 1,
      status: normalizeTripStatus(trip.status ?? "draft"),
      notes: trip.notes || "",
      createdAt: trip.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function createTripAction({
  clientId,
  title,
  destination,
  startDate,
  endDate,
  travelerCount,
  status,
  notes,
}: {
  clientId?: string
  title: string
  destination?: string
  startDate?: string
  endDate?: string
  travelerCount?: string
  status?: string
  notes?: string
}) {
  const actor = await getTripActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo da viagem." }
  }

  const resolvedClient = await validateClientForWorkspace(actor, clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const { data, error } = await actor.adminClient
    .from("trips")
    .insert({
      workspace_id: actor.workspaceId,
      client_id: resolvedClient.clientId,
      title: trimmedTitle,
      destination: destination?.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      traveler_count: normalizeTravelerCount(travelerCount ?? "1"),
      status: normalizeTripStatus(status ?? "draft"),
      notes: notes?.trim() || null,
      created_by: actor.actorId,
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a viagem." }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "operations",
    action: "operation_created",
    description: "viagem criada",
  })

  return { success: true, tripId: data.id }
}

export async function updateTripAction({
  tripId,
  clientId,
  title,
  destination,
  startDate,
  endDate,
  travelerCount,
  status,
  notes,
}: {
  tripId: string
  clientId?: string
  title: string
  destination: string
  startDate?: string
  endDate?: string
  travelerCount?: string
  status: string
  notes: string
}) {
  const actor = await getTripActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar viagens." }
  }

  const resolvedTrip = await resolveTripForActor(actor, tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo da viagem." }
  }

  const resolvedClient = await validateClientForWorkspace(actor, clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const { error } = await actor.adminClient
    .from("trips")
    .update({
      client_id: resolvedClient.clientId,
      title: trimmedTitle,
      destination: destination.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      traveler_count: normalizeTravelerCount(travelerCount ?? "1"),
      status: normalizeTripStatus(status),
      notes: notes.trim() || null,
    })
    .eq("id", tripId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "operations",
    action: "operation_updated",
    description: "viagem atualizada",
  })

  return { success: true, tripId: resolvedTrip.trip.id }
}
