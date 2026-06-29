"use server"

import { canManageWorkspace, getUserAccessForUser, type WorkspaceMetadata } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type MemberRecord = {
  user_id: string
  role: string
}

type ProfileListRecord = {
  id: string
  full_name: string | null
  email: string | null
}

export async function updateWorkspaceDetailsAction({
  name,
  segment,
  cnpj,
  phone,
  email,
  site,
  address,
}: {
  name: string
  segment: string
  cnpj: string
  phone: string
  email: string
  site: string
  address: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  if (!canManageWorkspace(access)) {
    return { error: "Você não tem permissão para editar a empresa." }
  }

  const nextMetadata: WorkspaceMetadata = {
    ...(access.workspace.metadata ?? {}),
    segment: segment.trim() || "",
    cnpj: cnpj.trim() || "",
    phone: phone.trim() || "",
    email: email.trim() || "",
    site: site.trim() || "",
    address: address.trim() || "",
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      name: name.trim() || null,
      metadata: nextMetadata,
    })
    .eq("id", access.workspace.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getWorkspaceMembersAction() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", access.workspace.id)
    .returns<MemberRecord[]>()

  if (membersError) {
    return { error: membersError.message }
  }

  const memberIds = members?.map((member) => member.user_id) ?? []

  if (memberIds.length === 0) {
    return { success: true, members: [] }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", memberIds)
    .returns<ProfileListRecord[]>()

  if (profilesError) {
    return { error: profilesError.message }
  }

  const profilesMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const hydratedMembers = (members ?? []).map((member) => {
    const memberProfile = profilesMap.get(member.user_id)
    return {
      userId: member.user_id,
      role: member.role,
      fullName: memberProfile?.full_name || memberProfile?.email || "Usuário sem nome",
      email: memberProfile?.email || "Sem e-mail",
    }
  })

  return {
    success: true,
    members: hydratedMembers,
    canManage: canManageWorkspace(access),
  }
}

export async function addWorkspaceMemberAction({
  email,
  role,
}: {
  email: string
  role: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  if (!canManageWorkspace(access)) {
    return { error: "Você não tem permissão para editar a equipe." }
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return { error: "Informe um e-mail válido." }
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle<ProfileListRecord>()

  if (profileError) {
    return { error: profileError.message }
  }

  if (!existingProfile) {
    return { error: "Convites por e-mail serão ativados posteriormente." }
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", access.workspace.id)
    .eq("user_id", existingProfile.id)
    .maybeSingle()

  if (membershipLookupError) {
    return { error: membershipLookupError.message }
  }

  if (existingMembership) {
    return { error: "Este usuário já faz parte do workspace." }
  }

  const { error: insertError } = await supabase.from("workspace_members").insert({
    workspace_id: access.workspace.id,
    user_id: existingProfile.id,
    role: role.trim() || "member",
  })

  if (insertError) {
    return { error: insertError.message }
  }

  return { success: true }
}

export async function updatePrimarySystemAction({
  primarySystemName,
  primarySystemUrl,
  primarySystemType,
  primarySystemNotes,
}: {
  primarySystemName: string
  primarySystemUrl: string
  primarySystemType: string
  primarySystemNotes: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." }
  }

  if (!canManageWorkspace(access)) {
    return { error: "Você não tem permissão para editar o sistema principal." }
  }

  let normalizedUrl = primarySystemUrl.trim()
  if (!normalizedUrl) {
    return { error: "Informe a URL do sistema principal." }
  }

  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  const nextMetadata: WorkspaceMetadata = {
    ...(access.workspace.metadata ?? {}),
    primary_system_type: primarySystemType.trim() || "",
    primary_system_notes: primarySystemNotes.trim() || "",
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      primary_system_name: primarySystemName.trim() || null,
      primary_system_url: normalizedUrl,
      metadata: nextMetadata,
    })
    .eq("id", access.workspace.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
