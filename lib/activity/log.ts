import { createSupabaseAdminClient } from "@/lib/supabase/server"

type ActivityAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>

export async function logWorkspaceActivity({
  adminClient,
  workspaceId,
  userId,
  area,
  action,
  description,
}: {
  adminClient: ActivityAdminClient
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
    console.error(`[${area}] activity-log:`, error.message)
  }
}
