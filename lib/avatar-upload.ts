"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export async function uploadAvatarFile({
  file,
  userId,
}: {
  file: File
  userId: string
}) {
  const validTypes = ["image/png", "image/jpeg", "image/webp"]

  if (!validTypes.includes(file.type)) {
    return { error: "Selecione uma imagem PNG, JPEG ou WEBP." }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "A imagem deve ter no maximo 5 MB." }
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const filePath = `${userId}/avatar.${extension}`

  try {
    const supabase = createSupabaseBrowserClient()
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      const normalizedMessage = uploadError.message.toLowerCase()
      return {
        error:
          normalizedMessage.includes("bucket") || normalizedMessage.includes("storage")
            ? "Storage de avatar ainda nao configurado."
            : uploadError.message,
      }
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

    return {
      success: true,
      publicUrl: data.publicUrl,
    }
  } catch {
    return { error: "Storage de avatar ainda nao configurado." }
  }
}
