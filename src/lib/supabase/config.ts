const PLACEHOLDER_PATTERN = /your-|placeholder/i;

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || PLACEHOLDER_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(key)) {
    return null;
  }
  if (key.startsWith("sb_secret_")) return null;

  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
  } catch {
    return null;
  }

  return { url, key };
}

export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || PLACEHOLDER_PATTERN.test(key)) return null;
  if (key.startsWith("NEXT_PUBLIC_")) return null;
  return key;
}
