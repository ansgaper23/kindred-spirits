import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FULL_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})\/[a-zA-Z0-9._-]{1,100}$/;

/** List the repositories the current user has connected (from our own DB, RLS-scoped). */
export const listRepositories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("repositories")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { repositories: data ?? [] };
  });

export const getRepository = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: repository, error } = await context.supabase
      .from("repositories")
      .select("*")
      .eq("id", data.repositoryId)
      .single();
    if (error || !repository) throw new Error("Repositorio no encontrado.");
    return { repository };
  });

/**
 * List the authenticated user's real GitHub repos, using the GitHub OAuth
 * token captured at login (profiles.github_access_token). Returns an empty
 * list with `connected: false` if the user hasn't signed in with GitHub.
 */
export const listGithubRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("github_access_token, github_username")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.github_access_token) {
      return { connected: false as const, repos: [], username: null };
    }

    const { listMyRepos } = await import("@/lib/github/client.server");
    try {
      const repos = await listMyRepos(profile.github_access_token, 100);
      return { connected: true as const, repos, username: profile.github_username ?? null };
    } catch (err) {
      console.error("Failed to list GitHub repos:", err);
      const detail = err instanceof Error ? err.message : "No se pudo consultar la API de GitHub.";
      return {
        connected: true as const,
        repos: [],
        username: profile.github_username ?? null,
        error: detail,
      };
    }
  });

export const connectRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        fullName: z.string().regex(FULL_NAME_RE, "Usa el formato owner/repo"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const [owner, name] = data.fullName.split("/");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("github_access_token")
      .eq("id", context.userId)
      .maybeSingle();

    const { getRepo, GithubApiError } = await import("@/lib/github/client.server");

    let repo;
    try {
      repo = await getRepo(owner!, name!, profile?.github_access_token ?? null);
    } catch (err) {
      if (err instanceof GithubApiError && err.status === 404) {
        throw new Error("No se encontró ese repositorio (¿es privado? conecta GitHub para verlo).");
      }
      throw new Error("No se pudo validar el repositorio en GitHub.");
    }

    const { data: inserted, error } = await context.supabase
      .from("repositories")
      .upsert(
        {
          owner: repo.owner,
          name: repo.name,
          full_name: repo.fullName,
          description: repo.description,
          default_branch: repo.defaultBranch,
          html_url: repo.htmlUrl,
          user_id: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,full_name" },
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { repository: inserted };
  });

export const disconnectRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("repositories")
      .delete()
      .eq("id", data.repositoryId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
