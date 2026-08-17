import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Ensure a `profiles` row exists for the current user, and report back
 * whether GitHub is connected (never returns the raw token to the client).
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        email: z.string().email(),
        fullName: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // 1. Fetch current profile to see if we already have a token
    const { data: currentProfile } = await context.supabase
      .from("profiles")
      .select("github_access_token, github_username")
      .eq("id", context.userId)
      .maybeSingle();

    const providerToken = context.claims?.["provider_token"];
    
    // 2. Perform the upsert
    // We explicitly target the 'id' constraint which is the Primary Key
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .upsert(
        {
          id: context.userId,
          email: data.email,
          full_name: data.fullName ?? null,
          avatar_url: data.avatarUrl ?? null,
          github_access_token: providerToken ?? currentProfile?.github_access_token ?? null,
          github_username: currentProfile?.github_username ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, email, full_name, avatar_url, github_username, github_access_token")
      .single();

    if (error) throw new Error(error.message);

    return { profile, githubConnected: Boolean(profile?.github_access_token) };
  });

/**
 * Persists a GitHub access token for the current user — either captured
 * automatically right after a "Sign in with GitHub" OAuth redirect, or
 * pasted manually by the user (a GitHub Personal Access Token with `repo`
 * scope, created at github.com/settings/tokens). Either way it's validated
 * against the GitHub API first so we never silently save a broken token.
 */
export const saveGithubToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ providerToken: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { getAuthenticatedUser } = await import("@/lib/github/client.server");
    const identity = await getAuthenticatedUser(data.providerToken).catch(() => null);
    if (!identity) {
      throw new Error(
        "Ese token no es válido o no tiene permisos suficientes. Verifica que tenga el alcance 'repo'.",
      );
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({
        github_access_token: data.providerToken,
        github_username: identity.login,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true, githubUsername: identity.login };
  });

/** Disconnects the user's GitHub account by clearing the stored token. */
export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        github_access_token: null,
        github_username: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
