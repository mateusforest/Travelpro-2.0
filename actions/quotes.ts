"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired" | "archived"

type QuoteRow = {
  id: string
  workspace_id: string
  client_id: string | null
  trip_id: string | null
  title: string
  status: QuoteStatus | string | null
  currency: string | null
  total_amount: number | null
  valid_until: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

type WorkspaceLookupRow = {
  id: string
  workspace_id: string
}

type QuoteActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getQuoteActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para cotacoes." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies QuoteActor
}

function normalizeQuoteStatus(status: string): QuoteStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "sent" || normalized === "enviada") return "sent"
  if (normalized === "approved" || normalized === "aprovada") return "approved"
  if (normalized === "rejected" || normalized === "rejeitada") return "rejected"
  if (normalized === "expired" || normalized === "expirada") return "expired"
  if (normalized === "archived" || normalized === "arquivada") return "archived"
  return "draft"
}

function parseAmount(amount: string) {
  const normalized = amount.replace(/\./g, "").replace(",", ".").trim()
  const value = Number(normalized)
  return Number.isFinite(value) ? value : NaN
}

async function resolveQuoteForActor(actor: QuoteActor, quoteId: string) {
  const { data, error } = await actor.adminClient
    .from("quotes")
    .select("id, workspace_id, client_id, trip_id, title, status, currency, total_amount, valid_until, notes, created_by, created_at")
    .eq("id", quoteId)
    .maybeSingle<QuoteRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Cotacao nao encontrada neste workspace." }
  }

  return { quote: data }
}

async function validateWorkspaceLink(
  actor: QuoteActor,
  table: "clients" | "trips",
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
    return { error: `${table === "clients" ? "Cliente" : "Viagem"} nao encontrado neste workspace.` }
  }

  return { id: data.id }
}

export async function getQuotesAction() {
  const actor = await getQuoteActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("quotes")
    .select("id, workspace_id, client_id, trip_id, title, status, currency, total_amount, valid_until, notes, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<QuoteRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    quotes: (data ?? []).map((quote) => ({
      id: quote.id,
      clientId: quote.client_id,
      tripId: quote.trip_id,
      title: quote.title,
      status: normalizeQuoteStatus(quote.status ?? "draft"),
      currency: quote.currency ?? "BRL",
      totalAmount: typeof quote.total_amount === "number" ? quote.total_amount : 0,
      validUntil: quote.valid_until,
      notes: quote.notes || "",
      createdAt: quote.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function createQuoteAction({
  clientId,
  tripId,
  title,
  status,
  currency,
  totalAmount,
  validUntil,
  notes,
}: {
  clientId?: string
  tripId?: string
  title: string
  status?: string
  currency?: string
  totalAmount: string
  validUntil?: string
  notes: string
}) {
  const actor = await getQuoteActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem criar cotacoes." }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo da cotacao." }
  }

  const parsedAmount = parseAmount(totalAmount)
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return { error: "Informe um valor valido para a cotacao." }
  }

  const resolvedClient = await validateWorkspaceLink(actor, "clients", clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const resolvedTrip = await validateWorkspaceLink(actor, "trips", tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const { data, error } = await actor.adminClient
    .from("quotes")
    .insert({
      workspace_id: actor.workspaceId,
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      title: trimmedTitle,
      status: normalizeQuoteStatus(status ?? "draft"),
      currency: (currency || "BRL").trim().toUpperCase().slice(0, 3) || "BRL",
      total_amount: parsedAmount,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      created_by: actor.actorId,
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a cotacao." }
  }

  return { success: true, quoteId: data.id }
}

export async function updateQuoteAction({
  quoteId,
  clientId,
  tripId,
  title,
  status,
  currency,
  totalAmount,
  validUntil,
  notes,
}: {
  quoteId: string
  clientId?: string
  tripId?: string
  title: string
  status: string
  currency?: string
  totalAmount: string
  validUntil?: string
  notes: string
}) {
  const actor = await getQuoteActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar cotacoes." }
  }

  const resolvedQuote = await resolveQuoteForActor(actor, quoteId)
  if ("error" in resolvedQuote) {
    return { error: resolvedQuote.error }
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo da cotacao." }
  }

  const parsedAmount = parseAmount(totalAmount)
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return { error: "Informe um valor valido para a cotacao." }
  }

  const resolvedClient = await validateWorkspaceLink(actor, "clients", clientId)
  if ("error" in resolvedClient) {
    return { error: resolvedClient.error }
  }

  const resolvedTrip = await validateWorkspaceLink(actor, "trips", tripId)
  if ("error" in resolvedTrip) {
    return { error: resolvedTrip.error }
  }

  const { error } = await actor.adminClient
    .from("quotes")
    .update({
      client_id: resolvedClient.id,
      trip_id: resolvedTrip.id,
      title: trimmedTitle,
      status: normalizeQuoteStatus(status),
      currency: (currency || "BRL").trim().toUpperCase().slice(0, 3) || "BRL",
      total_amount: parsedAmount,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
    })
    .eq("id", quoteId)

  if (error) {
    return { error: error.message }
  }

  return { success: true, quoteId: resolvedQuote.quote.id }
}
