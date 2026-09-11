import { NextRequest, NextResponse } from "next/server"
import pages from "@/lib/travelpro/pages.json"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"
export const dynamic = "force-dynamic"
export async function GET(request: NextRequest, context: { params: Promise<{ view: string }> }) {
  const { view } = await context.params
  if (!Object.prototype.hasOwnProperty.call(pages, view)) return new NextResponse("Página não encontrada", {status:404})
  if (!["index", "login", "cadastro"].includes(view)) {
    const supabase = await createSupabaseServerClient()
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL("/login", request.url))
    const access = await getUserAccessForUser(user)
    if (access.workspace?.type !== "operations" || !access.membershipRole) return new NextResponse("Esta conta não tem acesso a uma agência de viagens.", {status:403})
  }
  return new NextResponse(pages[view as keyof typeof pages], {headers: {
    "Content-Type":"text/html; charset=utf-8", "Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff", "Referrer-Policy":"strict-origin-when-cross-origin"
  }})
}
