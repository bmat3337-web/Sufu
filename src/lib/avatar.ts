import { supabase } from "./supabase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validate(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 5 MB or smaller.";
  return null;
}

export async function uploadAvatar(file: File, userId: string): Promise<{ url?: string; error?: string }> {
  const invalid = validate(file);
  if (invalid) return { error: invalid };
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = userId + "/" + crypto.randomUUID() + "." + extension;
  const { error } = await supabase.storage.from("sufu-avatars").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { error: "The profile photo could not be uploaded." };
  const { data } = supabase.storage.from("sufu-avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
