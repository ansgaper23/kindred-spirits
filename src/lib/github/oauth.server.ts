import { createHmac, timingSafeEqual } from "node:crypto";

const GITHUB_SCOPES = "repo read:user workflow";

function clientId(): string {
  const id = process.env["GITHUB_OAUTH_CLIENT_ID"];
  if (!id) throw new Error("GITHUB_OAUTH_CLIENT_ID no está configurado.");
  return id;
}

function clientSecret(): string {
  const secret = process.env["GITHUB_OAUTH_CLIENT_SECRET"];
  if (!secret) throw new Error("GITHUB_OAUTH_CLIENT_SECRET no está configurado.");
  return secret;
}

/** Signed state so the callback can be tied to the user that started the flow. */
export function signState(userId: string): string {
  const nonce = Date.now().toString(36);
  const mac = createHmac("sha256", clientSecret()).update(`${userId}:${nonce}`).digest("hex");
  return `${nonce}.${mac}`;
}

export function verifyState(userId: string, state: string): boolean {
  const [nonce, mac] = state.split(".");
  if (!nonce || !mac) return false;
  const expected = createHmac("sha256", clientSecret()).update(`${userId}:${nonce}`).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", GITHUB_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      code,
      redirect_uri: redirectUri,
    }),
  });

  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description ?? "GitHub rechazó el intercambio del código.");
  }
  return body.access_token;
}
