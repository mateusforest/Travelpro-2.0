import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.json({
      user: null,
      profile: null,
      workspace: null,
      membershipRole: null,
    })
  }

  const access = await getUserAccessForUser(data.user)

  return NextResponse.json({
    user: {
      id: access.user.id,
      email: access.user.email ?? null,
    },
    profile: access.profile,
    workspace: access.workspace,
    membershipRole: access.membershipRole,
  })
}
