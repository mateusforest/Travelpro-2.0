import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"

export async function validateOperationsActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  if (access.workspace.type !== "operations") {
    return { error: "O Operations Engine esta disponivel apenas para workspaces COS Operacoes." as const }
  }

  return {
    user: authData.user,
    access,
  }
}
