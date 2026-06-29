import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import {
  canAccessPath,
  resolveHomePath,
  resolvePostAuthPath,
} from "@/lib/auth-routing"

export type WorkspaceType = "operations" | "connect"
export type GlobalRole = "master" | string | null
export type WorkspaceRole = "owner" | "admin" | "member" | string | null

export type WorkspaceMetadata = {
  segment?: string
  cnpj?: string
  phone?: string
  email?: string
  site?: string
  address?: string
  primary_system_type?: string
  primary_system_notes?: string
  [key: string]: unknown
}

export type ProfileRecord = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  global_role: GlobalRole
}

export type WorkspaceRecord = {
  id: string
  name: string | null
  type: WorkspaceType | null
  owner_id: string | null
  primary_system_name: string | null
  primary_system_url: string | null
  metadata: WorkspaceMetadata | null
}

export type UserAccess = {
  user: User
  profile: ProfileRecord | null
  workspace: WorkspaceRecord | null
  membershipRole: WorkspaceRole
}

type QueryClient = Pick<SupabaseClient, "from">

function getQueryClient(queryClient?: QueryClient) {
  return queryClient ?? createSupabaseAdminClient()
}

function logWorkspaceBootstrapError(step: string, details: string) {
  console.error(`[auth-bootstrap] ${step}: ${details}`)
}

export function canManageWorkspace(access: Pick<UserAccess, "profile" | "membershipRole">) {
  return access.profile?.global_role === "master" || access.membershipRole === "owner" || access.membershipRole === "admin"
}

export async function getUserAccessForUser(user: User, queryClient?: QueryClient): Promise<UserAccess> {
  const client = getQueryClient(queryClient)

  if (!client) {
    return {
      user,
      profile: null,
      workspace: null,
      membershipRole: null,
    }
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    client
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, global_role")
      .eq("id", user.id)
      .maybeSingle<ProfileRecord>(),
    client.from("workspace_members").select("workspace_id, role").eq("user_id", user.id),
  ])

  const preferredMembership = memberships?.find((membership) => membership.role === "owner") ?? memberships?.[0] ?? null

  let workspace: WorkspaceRecord | null = null

  if (preferredMembership?.workspace_id) {
    const { data } = await client
      .from("workspaces")
      .select("id, name, type, owner_id, primary_system_name, primary_system_url, metadata")
      .eq("id", preferredMembership.workspace_id)
      .maybeSingle<WorkspaceRecord>()

    workspace = data ?? null
  }

  return {
    user,
    profile: profile ?? null,
    workspace,
    membershipRole: preferredMembership?.role ?? null,
  }
}

export { canAccessPath, resolveHomePath, resolvePostAuthPath }

async function ensureWorkspaceForIdentity({
  userId,
  email,
  displayName,
  productType,
}: {
  userId: string
  email: string
  displayName: string
  productType: WorkspaceType
}) {
  const client = createSupabaseAdminClient()

  if (!client) {
    return {
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada para concluir o cadastro.",
    }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = displayName.trim() || normalizedEmail.split("@")[0] || "Workspace"

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: userId,
      full_name: normalizedName,
      email: normalizedEmail || null,
    },
    {
      onConflict: "id",
    },
  )

  if (profileError) {
    logWorkspaceBootstrapError("profile-upsert", profileError.message)
    return { error: profileError.message }
  }

  const { data: existingMemberships, error: membershipLookupError } = await client
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)

  if (membershipLookupError) {
    logWorkspaceBootstrapError("membership-lookup", membershipLookupError.message)
    return { error: membershipLookupError.message }
  }

  if (existingMemberships && existingMemberships.length > 0) {
    for (const membership of existingMemberships) {
      const { data: existingWorkspace, error: existingWorkspaceError } = await client
        .from("workspaces")
        .select("id, name, type, owner_id, primary_system_name, primary_system_url, metadata")
        .eq("id", membership.workspace_id)
        .maybeSingle<WorkspaceRecord>()

      if (existingWorkspaceError) {
        logWorkspaceBootstrapError("workspace-lookup", existingWorkspaceError.message)
        return { error: existingWorkspaceError.message }
      }

      if (existingWorkspace) {
        return { workspace: existingWorkspace }
      }
    }
  }

  const { data: ownedWorkspace, error: ownedWorkspaceError } = await client
    .from("workspaces")
    .select("id, name, type, owner_id, primary_system_name, primary_system_url, metadata")
    .eq("owner_id", userId)
    .maybeSingle<WorkspaceRecord>()

  if (ownedWorkspaceError) {
    logWorkspaceBootstrapError("owned-workspace-lookup", ownedWorkspaceError.message)
    return { error: ownedWorkspaceError.message }
  }

  if (ownedWorkspace) {
    const { error: membershipRepairError } = await client.from("workspace_members").upsert(
      {
        workspace_id: ownedWorkspace.id,
        user_id: userId,
        role: "owner",
      },
      {
        onConflict: "workspace_id,user_id",
      },
    )

    if (membershipRepairError) {
      logWorkspaceBootstrapError("membership-repair", membershipRepairError.message)
      return { error: membershipRepairError.message }
    }

    return { workspace: ownedWorkspace }
  }

  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .insert({
      name: normalizedName,
      type: productType,
      owner_id: userId,
      metadata: {},
    })
    .select("id, name, type, owner_id, primary_system_name, primary_system_url, metadata")
    .single<WorkspaceRecord>()

  if (workspaceError || !workspace) {
    logWorkspaceBootstrapError("workspace-insert", workspaceError?.message ?? "workspace vazio")
    return { error: workspaceError?.message ?? "Não foi possível criar o workspace." }
  }

  const { error: memberError } = await client.from("workspace_members").upsert(
    {
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    },
    {
      onConflict: "workspace_id,user_id",
    },
  )

  if (memberError) {
    logWorkspaceBootstrapError("membership-insert", memberError.message)
    return { error: memberError.message }
  }

  return { workspace }
}

export async function bootstrapWorkspaceForUser({
  userId,
  email,
  displayName,
  productType,
}: {
  userId: string
  email: string
  displayName: string
  productType: WorkspaceType
}) {
  return ensureWorkspaceForIdentity({
    userId,
    email,
    displayName,
    productType,
  })
}

export async function ensureWorkspaceForUser({
  user,
  access,
  productType,
}: {
  user: User
  access?: Pick<UserAccess, "profile" | "workspace" | "membershipRole">
  productType: WorkspaceType
}) {
  if (access?.workspace?.id && access.membershipRole) {
    return { workspace: access.workspace }
  }

  const metadataName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : ""
  const displayName = access?.profile?.full_name || metadataName || user.email || "Workspace"

  return ensureWorkspaceForIdentity({
    userId: user.id,
    email: user.email ?? access?.profile?.email ?? "",
    displayName,
    productType,
  })
}
