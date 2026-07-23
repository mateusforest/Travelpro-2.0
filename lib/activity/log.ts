"use server"

import type { createSupabaseAdminClient } from "@/lib/supabase/server"

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>

export async function logWorkspaceActivity({
  adminClient,
  workspaceId,
  userId,
  area,
  action,
  description,
}: {
  adminClient: AdminClient
  workspaceId: string
  userId: string
  area: string
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area,
    action,
    description,
  })

  if (error) {
    console.error(`[activity:${area}]`, error.message)
  }
}
