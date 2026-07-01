import { createClient } from "@supabase/supabase-js"
import { ApiError } from "./api-client"

const BABY_PHOTO_BUCKET = "baby-photos"

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new ApiError(
      500,
      "Supabase Storage is not configured.",
      "",
    )
  }

  return createClient(url, anonKey)
}

function safeFileName(file: File) {
  const extension = file.name.split(".").pop() || "jpg"
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return `${baseName || "photo"}-${Date.now()}.${extension}`
}

export async function uploadBabyPhoto(file: File): Promise<string> {
  const supabase = getSupabaseClient()
  const path = `baby-profiles/${safeFileName(file)}`
  const { error } = await supabase.storage
    .from(BABY_PHOTO_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new ApiError(400, error.message, "")

  const {
    data: { publicUrl },
  } = supabase.storage.from(BABY_PHOTO_BUCKET).getPublicUrl(path)

  return publicUrl
}
