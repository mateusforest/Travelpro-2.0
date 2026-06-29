export type ConversationContextMessageRow = {
  id: string
  role: string | null
  content: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export const operationsConversationMemoryWindowSize = 10

export function buildConversationContextWindow(
  rows: ConversationContextMessageRow[],
  size = operationsConversationMemoryWindowSize,
) {
  if (rows.length <= size) {
    return rows
  }

  return rows.slice(-size)
}
