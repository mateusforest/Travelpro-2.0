"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  bootstrapWorkspaceForUser,
  ensureAppAccessForUser,
  getUserAccessForUser,
  resolvePostAuthPath,
  type WorkspaceType,
} from "@/lib/auth"

export async function loginAction({
  email,
  password,
  nextPath,
}: {
  email: string
  password: string
  nextPath?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: "Não foi possível iniciar a sessão." }
  }

  const accessResult = await ensureAppAccessForUser({
    user: data.user,
    access: await getUserAccessForUser(data.user),
    productType: "operations",
  })

  if (accessResult.error || !accessResult.access) {
    return {
      error: accessResult.error ?? "Conta autenticada, mas o acesso inicial nao pode ser preparado.",
      needsWorkspaceSetup: true,
    }
  }

  const access = accessResult.access
  const redirectTo = resolvePostAuthPath(access, nextPath)

  if (!redirectTo) {
    return {
      error: "Conta autenticada, mas workspace não encontrado. Crie um workspace agora ou contate o suporte.",
      needsWorkspaceSetup: true,
    }
  }

  return {
    redirectTo,
  }
}

export async function signupAction({
  name,
  email,
  password,
  productType,
}: {
  name: string
  email: string
  password: string
  productType: WorkspaceType
}) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: "Não foi possível criar a conta." }
  }

  const bootstrap = await bootstrapWorkspaceForUser({
    userId: data.user.id,
    email,
    displayName: name,
    productType,
  })

  if (bootstrap.error) {
    console.error("[signup-bootstrap]", bootstrap.error)
    return { error: bootstrap.error }
  }

  return {
    redirectTo: productType === "connect" ? "/connect" : "/app",
  }
}

export async function ensureWorkspaceForCurrentUserAction({
  productType,
}: {
  productType: WorkspaceType
}) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { error: "Sessão inválida. Faça login novamente." }
  }

  const access = await getUserAccessForUser(data.user)

  if (access.workspace?.id && access.membershipRole) {
    return {
      redirectTo: resolvePostAuthPath(access) ?? (access.workspace.type === "connect" ? "/connect" : "/app"),
    }
  }

  const accessResult = await ensureAppAccessForUser({
    user: data.user,
    access,
    productType,
  })

  if (accessResult.error || !accessResult.access) {
    console.error("[ensure-workspace]", accessResult.error)
    return { error: accessResult.error ?? "Nao foi possivel preparar o workspace." }
  }

  const redirectTo = resolvePostAuthPath(accessResult.access)

  if (!redirectTo) {
    return { error: "Workspace criado, mas o redirecionamento não pôde ser resolvido." }
  }

  return { redirectTo }
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  return { redirectTo: "/login" }
}
