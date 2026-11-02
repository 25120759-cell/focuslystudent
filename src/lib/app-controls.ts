// Shared helpers for admin-controlled switches. Safe for both server and browser.
export interface AppSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  banner_message: string;
  banner_tone: "info" | "warning" | "success";
  ai_enabled: boolean;
  packs_enabled: boolean;
  trading_enabled: boolean;
  social_posting_enabled: boolean;
  doc_sharing_enabled: boolean;
  free_daily_ai_limit: number | null;
  updated_at?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  maintenance_mode: false,
  maintenance_message: "",
  banner_message: "",
  banner_tone: "info",
  ai_enabled: true,
  packs_enabled: true,
  trading_enabled: true,
  social_posting_enabled: true,
  doc_sharing_enabled: true,
  free_daily_ai_limit: null,
};

export async function loadSettings(supabase: any): Promise<AppSettings> {
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}

/** Throws if the caller is suspended / locked out by maintenance, or the feature is switched off. */
export async function assertAllowed(
  supabase: any,
  userId: string,
  feature?: "ai_enabled" | "packs_enabled" | "trading_enabled" | "social_posting_enabled" | "doc_sharing_enabled",
): Promise<AppSettings> {
  const [settings, blocked] = await Promise.all([
    loadSettings(supabase),
    supabase.rpc("app_blocked", { _user_id: userId }),
  ]);
  if (blocked.data === true) throw new Error("Your account can't do this right now (maintenance or suspension).");
  if (feature && !settings[feature]) {
    const { data: isAdmin } = await supabase.rpc("is_app_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("This feature is temporarily turned off by the Cogni team.");
  }
  return settings;
}

/** A suspension is active only while its end time is in the future. */
export function isSuspensionActive(until: string | null | undefined, now = Date.now()) {
  return !!until && new Date(until).getTime() > now;
}
