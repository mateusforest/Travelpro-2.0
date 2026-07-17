"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const MAX_INPUT_BYTES = 20 * 1024 * 1024
const MAX_AVATAR_DIMENSION = 768
const TARGET_OUTPUT_BYTES = 1 * 1024 * 1024

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Nao foi possivel ler a imagem selecionada."))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nao foi possivel preparar a imagem do avatar."))
          return
        }

        resolve(blob)
      },
      "image/webp",
      quality,
    )
  })
}

async function optimizeAvatarFile(file: File) {
  const image = await loadImageFromFile(file)
  const longestSide = Math.max(image.width, image.height)
  const scale = longestSide > MAX_AVATAR_DIMENSION ? MAX_AVATAR_DIMENSION / longestSide : 1
  let width = Math.max(1, Math.round(image.width * scale))
  let height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem do avatar.")
  }

  let quality = 0.9
  let blob: Blob | null = null

  for (let attempt = 0; attempt < 6; attempt += 1) {
    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    blob = await canvasToBlob(canvas, quality)

    if (blob.size <= TARGET_OUTPUT_BYTES) {
      break
    }

    quality = Math.max(0.55, quality - 0.1)

    if (blob.size > TARGET_OUTPUT_BYTES && attempt >= 2) {
      width = Math.max(256, Math.round(width * 0.85))
      height = Math.max(256, Math.round(height * 0.85))
    }
  }

  if (!blob) {
    throw new Error("Nao foi possivel preparar a imagem do avatar.")
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar"

  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  })
}

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

  if (file.size > MAX_INPUT_BYTES) {
    return { error: "A imagem deve ter no maximo 20 MB." }
  }

  try {
    const optimizedFile = await optimizeAvatarFile(file)
    const extension = optimizedFile.type === "image/webp" ? "webp" : "jpg"
    const filePath = `${userId}/avatar.${extension}`
    const supabase = createSupabaseBrowserClient()
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, optimizedFile, { upsert: true, contentType: optimizedFile.type })

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
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: "Storage de avatar ainda nao configurado." }
  }
}
