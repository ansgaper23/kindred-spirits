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
    // Use a more resilient pattern for RLS: check if exists, then insert or update.
    // Upsert sometimes triggers "new row violates RLS" in Supabase if the insert 
    // part of the upsert is evaluated against existing rows differently.
    const { data: existingProfile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();

    let result;
    if (existingProfile) {
      result = await context.supabase
        .from("profiles")
        .update({
          email: data.email,
          full_name: data.fullName ?? null,
          avatar_url: data.avatarUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", context.userId)
        .select("id, email, full_name, avatar_url, github_username")
        .single();
    } else {
      result = await context.supabase
        .from("profiles")
        .insert({
          id: context.userId,
          email: data.email,
          full_name: data.fullName ?? null,
          avatar_url: data.avatarUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .select("id, email, full_name, avatar_url, github_username")
        .single();
    }

    const { data: profile, error } = result;
    if (error) throw new Error(error.message);

    const { data: tokenRow } = await context.supabase
      .from("profiles")
      .select("github_access_token")
      .eq("id", context.userId)
      .maybeSingle();

    return { profile, githubConnected: Boolean(tokenRow?.github_access_token) };
  });

/**
 * Called once, right after a "Sign in with GitHub" redirect, with the
 * provider access token Supabase exposes on the client session. We persist
 * it so later server-side calls (listing repos, applying edits) can act on
 * the user's behalf without asking them to paste a token manually.
 */
export const saveGithubToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ providerToken: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { getAuthenticatedUser } = await import("@/lib/github/client.server");
    const identity = await getAuthenticatedUser(data.providerToken).catch(() => null);

    const { error } = await context.supabase
      .from("profiles")
      .update({
        github_access_token: data.providerToken,
        github_username: identity?.login ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true, githubUsername: identity?.login ?? null };
  });
