import { supabase } from "./supabase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadListingCoverImage(file: File, userId: string): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.has(file.type)) return { error: "Use a JPG, PNG, or WebP image." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Images must be 5 MB or smaller." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = userId + "/" + crypto.randomUUID() + "." + extension;
  const { error } = await supabase.storage.from("sufu-listings").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { error: "The image could not be uploaded." };

  const { data } = supabase.storage.from("sufu-listings").getPublicUrl(path);
  return { url: data.publicUrl };
}
