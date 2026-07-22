"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { logWorkspaceActivity } from "@/lib/activity/log"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

export type SupplierStatus = "active" | "inactive" | "archived"
export type SupplierCategory = "hotel" | "airline" | "operator" | "dmc" | "insurance" | "transfer" | "other"

type SupplierRow = {
  id: string
  workspace_id: string
  name: string
  category: SupplierCategory | string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  status: SupplierStatus | string | null
  created_by: string | null
  created_at: string | null
}

type SupplierActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

async function getSupplierActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para fornecedores." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies SupplierActor
}

function normalizeSupplierStatus(status: string): SupplierStatus {
  const normalized = status.trim().toLowerCase()
  if (normalized === "inactive" || normalized === "inativo") return "inactive"
  if (normalized === "archived" || normalized === "arquivado") return "archived"
  return "active"
}

function normalizeSupplierCategory(category: string): SupplierCategory {
  const normalized = category.trim().toLowerCase()
  if (normalized === "hotel") return "hotel"
  if (normalized === "airline" || normalized === "aerea" || normalized === "aérea") return "airline"
  if (normalized === "operator" || normalized === "operadora") return "operator"
  if (normalized === "dmc") return "dmc"
  if (normalized === "insurance" || normalized === "seguro") return "insurance"
  if (normalized === "transfer") return "transfer"
  return "other"
}

async function resolveSupplierForActor(actor: SupplierActor, supplierId: string) {
  const { data, error } = await actor.adminClient
    .from("suppliers")
    .select("id, workspace_id, name, category, contact_name, email, phone, website, notes, status, created_by, created_at")
    .eq("id", supplierId)
    .maybeSingle<SupplierRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Fornecedor nao encontrado neste workspace." }
  }

  return { supplier: data }
}

export async function getSuppliersAction() {
  const actor = await getSupplierActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("suppliers")
    .select("id, workspace_id, name, category, contact_name, email, phone, website, notes, status, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .returns<SupplierRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    suppliers: (data ?? []).map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      category: normalizeSupplierCategory(supplier.category ?? "other"),
      contactName: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      website: supplier.website || "",
      notes: supplier.notes || "",
      status: normalizeSupplierStatus(supplier.status ?? "active"),
      createdAt: supplier.created_at,
    })),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function createSupplierAction({
  name,
  category,
  contactName,
  email,
  phone,
  website,
  notes,
  status,
}: {
  name: string
  category?: string
  contactName: string
  email: string
  phone: string
  website: string
  notes: string
  status?: string
}) {
  const actor = await getSupplierActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem criar fornecedores." }
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do fornecedor." }
  }

  const { data, error } = await actor.adminClient
    .from("suppliers")
    .insert({
      workspace_id: actor.workspaceId,
      name: trimmedName,
      category: normalizeSupplierCategory(category ?? "other"),
      contact_name: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
      status: normalizeSupplierStatus(status ?? "active"),
      created_by: actor.actorId,
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar o fornecedor." }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "equipe",
    action: "supplier_created",
    description: "fornecedor criado",
  })

  return { success: true, supplierId: data.id }
}

export async function updateSupplierAction({
  supplierId,
  name,
  category,
  contactName,
  email,
  phone,
  website,
  notes,
  status,
}: {
  supplierId: string
  name: string
  category?: string
  contactName: string
  email: string
  phone: string
  website: string
  notes: string
  status: string
}) {
  const actor = await getSupplierActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar fornecedores." }
  }

  const resolvedSupplier = await resolveSupplierForActor(actor, supplierId)
  if ("error" in resolvedSupplier) {
    return { error: resolvedSupplier.error }
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do fornecedor." }
  }

  const { error } = await actor.adminClient
    .from("suppliers")
    .update({
      name: trimmedName,
      category: normalizeSupplierCategory(category ?? "other"),
      contact_name: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
      status: normalizeSupplierStatus(status),
    })
    .eq("id", supplierId)

  if (error) {
    return { error: error.message }
  }

  await logWorkspaceActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    area: "equipe",
    action: "supplier_updated",
    description: "fornecedor atualizado",
  })

  return { success: true, supplierId: resolvedSupplier.supplier.id }
}
