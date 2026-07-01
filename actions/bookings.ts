"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type BookingStatus = "draft" | "requested" | "confirmed" | "ticketed" | "cancelled" | "completed"
export type BookingType = "flight" | "hotel" | "tour" | "transfer" | "insurance" | "other"

type BookingRow = {
  id: string
  workspace_id: string
  trip_id: string | null
  client_id: string | null
  supplier_id: string | null
  booking_type: BookingType | string | null
  reference_code: string | null
  status: BookingStatus | string | null
  start_date: string | null
  end_date: string | null
  amount: number | null
  currency: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

type SupplierRow = {
  id: string
  workspace_id: string
  name: string
  status: string | null
}

type WorkspaceLookupRow = {
  id: string
  workspace_id: string
}

type BookingActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getBookingActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para reservas." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies BookingActor
}

function normalizeBookingStatus(status: string): BookingStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "requested" || normalized === "solicitada") return "requested"
  if (normalized === "confirmed" || normalized === "confirmada") return "confirmed"
  if (normalized === "ticketed" || normalized === "emitida") return "ticketed"
  if (normalized === "cancelled" || normalized === "cancelada") return "cancelled"
  if (normalized === "completed" || normalized === "concluida") return "completed"
  return "draft"
}

function normalizeBookingType(type: string): BookingType {
  const normalized = type.trim().toLowerCase()
  if (normalized === "flight" || normalized === "voo") return "flight"
  if (normalized === "hotel") return "hotel"
  if (normalized === "tour" || normalized === "passeio") return "tour"
  if (normalized === "transfer") return "transfer"
  if (normalized === "insurance" || normalized === "seguro") return "insurance"
  return "other"
}

function parseAmount(amount: string) {
  const normalized = amount.replace(/\./g, "").replace(",", ".").trim()
  const value = Number(normalized)
  return Number.isFinite(value) ? value : NaN
}

async function resolveBookingForActor(actor: BookingActor, bookingId: string) {
  const { data, error } = await actor.adminClient
    .from("bookings")
    .select("id, workspace_id, trip_id, client_id, supplier_id, booking_type, reference_code, status, start_date, end_date, amount, currency, notes, created_by, created_at")
    .eq("id", bookingId)
    .maybeSingle<BookingRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Reserva nao encontrada neste workspace." }
  }

  return { booking: data }
}

async function validateWorkspaceLink(
  actor: BookingActor,
  table: "clients" | "trips" | "suppliers",
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
    const label = table === "clients" ? "Cliente" : table === "trips" ? "Viagem" : "Fornecedor"
    return { error: `${label} nao encontrado neste workspace.` }
  }

  return { id: data.id }
}

export async function getBookingsAction() {
  const actor = await getBookingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("bookings")
    .select("id, workspace_id, trip_id, client_id, supplier_id, booking_type, reference_code, status, start_date, end_date, amount, currency, notes, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<BookingRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    bookings: (data ?? []).map((booking) => ({
      id: booking.id,
      tripId: booking.trip_id,
      clientId: booking.client_id,
      supplierId: booking.supplier_id,
      bookingType: normalizeBookingType(booking.booking_type ?? "other"),
      referenceCode: booking.reference_code || "",
      status: normalizeBookingStatus(booking.status ?? "draft"),
      startDate: booking.start_date,
      endDate: booking.end_date,
      amount: typeof booking.amount === "number" ? booking.amount : 0,
      currency: booking.currency ?? "BRL",
      notes: booking.notes || "",
      createdAt: booking.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getBookingSuppliersAction() {
  const actor = await getBookingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("suppliers")
    .select("id, workspace_id, name, status")
    .eq("workspace_id", actor.workspaceId)
    .returns<SupplierRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    suppliers: (data ?? [])
      .filter((supplier) => supplier.status !== "archived")
      .map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        status: supplier.status === "inactive" ? "inactive" : "active",
      })),
  }
}

export async function createBookingAction({
  clientId,
  tripId,
  supplierId,
  bookingType,
  referenceCode,
  status,
  startDate,
  endDate,
  amount,
  currency,
  notes,
}: {
  clientId?: string
  tripId?: string
  supplierId?: string
  bookingType?: string
  referenceCode: string
  status?: string
  startDate?: string
  endDate?: string
  amount: string
  currency?: string
  notes: string
}) {
  const actor = await getBookingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem criar reservas." }
  }

  const parsedAmount = parseAmount(amount)
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return { error: "Informe um valor valido para a reserva." }
  }

  const resolvedClient = await validateWorkspaceLink(actor, "clients", clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const resolvedTrip = await validateWorkspaceLink(actor, "trips", tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const resolvedSupplier = await validateWorkspaceLink(actor, "suppliers", supplierId)
  if ("error" in resolvedSupplier) {
    return { error: resolvedSupplier.error }
  }

  const { data, error } = await actor.adminClient
    .from("bookings")
    .insert({
      workspace_id: actor.workspaceId,
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      supplier_id: resolvedSupplier.id,
      booking_type: normalizeBookingType(bookingType ?? "other"),
      reference_code: referenceCode.trim() || null,
      status: normalizeBookingStatus(status ?? "draft"),
      start_date: startDate || null,
      end_date: endDate || null,
      amount: parsedAmount,
      currency: (currency || "BRL").trim().toUpperCase().slice(0, 3) || "BRL",
      notes: notes.trim() || null,
      created_by: actor.actorId,
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a reserva." }
  }

  return { success: true, bookingId: data.id }
}

export async function updateBookingAction({
  bookingId,
  clientId,
  tripId,
  supplierId,
  bookingType,
  referenceCode,
  status,
  startDate,
  endDate,
  amount,
  currency,
  notes,
}: {
  bookingId: string
  clientId?: string
  tripId?: string
  supplierId?: string
  bookingType?: string
  referenceCode: string
  status: string
  startDate?: string
  endDate?: string
  amount: string
  currency?: string
  notes: string
}) {
  const actor = await getBookingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar reservas." }
  }

  const resolvedBooking = await resolveBookingForActor(actor, bookingId)
  if ("error" in resolvedBooking) {
    return { error: resolvedBooking.error }
  }

  const parsedAmount = parseAmount(amount)
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return { error: "Informe um valor valido para a reserva." }
  }

  const resolvedClient = await validateWorkspaceLink(actor, "clients", clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const resolvedTrip = await validateWorkspaceLink(actor, "trips", tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const resolvedSupplier = await validateWorkspaceLink(actor, "suppliers", supplierId)
  if ("error" in resolvedSupplier) {
    return { error: resolvedSupplier.error }
  }

  const { error } = await actor.adminClient
    .from("bookings")
    .update({
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      supplier_id: resolvedSupplier.id,
      booking_type: normalizeBookingType(bookingType ?? "other"),
      reference_code: referenceCode.trim() || null,
      status: normalizeBookingStatus(status),
      start_date: startDate || null,
      end_date: endDate || null,
      amount: parsedAmount,
      currency: (currency || "BRL").trim().toUpperCase().slice(0, 3) || "BRL",
      notes: notes.trim() || null,
    })
    .eq("id", bookingId)

  if (error) {
    return { error: error.message }
  }

  return { success: true, bookingId: resolvedBooking.booking.id }
}
