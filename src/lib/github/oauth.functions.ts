import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function callbackUrl(): string {
  const request = getRequest();
  if (!request) throw new Error("El flujo OAuth debe iniciarse desde la app.");
  const url = new URL(request.url);
  
  // En Lovable, el host puede variar entre preview y producción.
  // GitHub requiere que el redirect_uri coincida EXACTAMENTE con el registrado.
  // Forzamos el uso del hostname actual para asegurar consistencia.
  const origin = `${url.protocol}//${url.hostname}`;
    
  return new URL("/oauth/github/callback", origin).toString();
}

/** Starts the custom GitHub OAuth App flow and returns the authorize URL. */
export const startGithubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { signState, buildAuthorizeUrl } = await import("@/lib/github/oauth.server");
    const redirectUri = callbackUrl();
    const state = signState(context.userId);
    return { authorizationUrl: buildAuthorizeUrl(state, redirectUri), redirectUri };
  });

/** Exchanges the OAuth code for an access token and stores it on the profile. */
export const completeGithubOAuth = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { verifyState, exchangeCodeForToken } = await import("@/lib/github/oauth.server");
    if (!verifyState(context.userId, data.state)) {
      throw new Error("El estado de OAuth no es válido. Vuelve a intentarlo.");
    }

    const token = await exchangeCodeForToken(data.code, callbackUrl());

    const { getAuthenticatedUser } = await import("@/lib/github/client.server");
    const identity = await getAuthenticatedUser(token);

    const { encrypt } = await import("@/lib/crypto.server");

    const { error } = await context.supabase
      .from("profiles")
      .update({
        github_access_token: encrypt(token),
        github_username: identity.login,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true, githubUsername: identity.login };
  });
