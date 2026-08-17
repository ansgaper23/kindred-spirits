// Minimal GitHub REST API client used by the agent and the repository/edit
// server functions. Deliberately dependency-free (plain fetch) since the only
// thing we need is a handful of well-known endpoints.
//
// SECURITY: this module never reads secrets from process.env itself — every
// call takes an explicit `token` (or `null` for unauthenticated, rate-limited
// public access). Callers are responsible for sourcing that token (usually
// the caller's own `profiles.github_access_token`, gated by RLS).

const GITHUB_API = "https://api.github.com";

export class GithubApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

interface RequestOptions {
  token?: string | null;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function githubRequest<T>(path: string, opts: RequestOptions = {}, retries = 2): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "codeflow-agent",
    ...opts.headers,
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
    });

    if (res.status === 429 || (res.status >= 500 && retries > 0)) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "1");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return githubRequest(path, opts, retries - 1);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new GithubApiError(
        res.status,
        `GitHub API ${opts.method ?? "GET"} ${path} failed (${res.status}): ${text.slice(0, 500)}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (retries > 0 && !(err instanceof GithubApiError)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return githubRequest(path, opts, retries - 1);
    }
    throw err;
  }
}

// Buffer isn't guaranteed on every deploy target (e.g. Cloudflare Workers
// without nodejs_compat), so base64 (de/en)coding falls back to
// atob/btoa + TextEncoder/TextDecoder, which are UTF-8 safe this way.
function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(str, "utf-8").toString("base64");
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(b64: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf-8");
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodePath(path: string): string {
  return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export interface RepoSummary {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}

// Minimal shapes of the GitHub REST API JSON we actually read. Not exhaustive
// — just enough fields to avoid `any` while parsing responses.
interface GithubRepoJson {
  owner: { login: string };
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  html_url: string;
}

function toRepoSummary(d: GithubRepoJson): RepoSummary {
  return {
    owner: d.owner.login,
    name: d.name,
    fullName: d.full_name,
    description: d.description,
    defaultBranch: d.default_branch,
    private: d.private,
    htmlUrl: d.html_url,
  };
}

/** Look up a single repo. Works unauthenticated for public repos. */
export async function getRepo(
  owner: string,
  name: string,
  token?: string | null,
): Promise<RepoSummary> {
  const data = await githubRequest<GithubRepoJson>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { token: token ?? null },
  );
  return toRepoSummary(data);
}

/** List repos the authenticated user has access to (requires a token). */
export async function listMyRepos(token: string, perPage = 100): Promise<RepoSummary[]> {
  const data = await githubRequest<GithubRepoJson[]>(
    `/user/repos?per_page=${perPage}&sort=updated&affiliation=owner,collaborator,organization_member`,
    { token },
  );
  return data.map(toRepoSummary);
}

export interface DirEntry {
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
}

interface GithubContentJson {
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size?: number;
  encoding?: string;
  content?: string;
  sha: string;
}

export async function listDirectory(
  owner: string,
  name: string,
  path: string,
  ref: string,
  token?: string | null,
): Promise<DirEntry[]> {
  const suffix = path ? `/${encodePath(path)}` : "";
  const data = await githubRequest<GithubContentJson | GithubContentJson[]>(
    `/repos/${owner}/${name}/contents${suffix}?ref=${encodeURIComponent(ref)}`,
    { token: token ?? null },
  );
  const items = Array.isArray(data) ? data : [data];
  return items.map((i) => ({ path: i.path, type: i.type, size: i.size ?? 0 }));
}

export interface FileContent {
  content: string;
  sha: string;
}

export async function getFileContent(
  owner: string,
  name: string,
  path: string,
  ref: string,
  token?: string | null,
): Promise<FileContent> {
  const data = await githubRequest<GithubContentJson | GithubContentJson[]>(
    `/repos/${owner}/${name}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    { token: token ?? null },
  );
  if (Array.isArray(data)) throw new Error(`"${path}" is a directory, not a file`);
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error(`Unexpected content encoding for "${path}"`);
  }
  return { content: fromBase64(data.content), sha: data.sha };
}

/** Best-effort file lookup — returns null instead of throwing on 404 (new file case). */
export async function tryGetFileContent(
  owner: string,
  name: string,
  path: string,
  ref: string,
  token?: string | null,
): Promise<FileContent | null> {
  try {
    return await getFileContent(owner, name, path, ref, token);
  } catch (err) {
    if (err instanceof GithubApiError && err.status === 404) return null;
    throw err;
  }
}

export interface CodeSearchResult {
  path: string;
}

interface GithubSearchCodeJson {
  items?: Array<{ path: string }>;
}

/** Code search requires auth for reasonable rate limits; degrades to [] on failure. */
export async function searchCode(
  owner: string,
  name: string,
  query: string,
  token?: string | null,
): Promise<CodeSearchResult[]> {
  try {
    const data = await githubRequest<GithubSearchCodeJson>(
      `/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${name}&per_page=15`,
      { token: token ?? null },
    );
    return (data.items ?? []).map((i) => ({ path: i.path }));
  } catch {
    return [];
  }
}

interface GithubRefJson {
  object: { sha: string };
}

export async function getBranchSha(
  owner: string,
  name: string,
  branch: string,
  token: string,
): Promise<string> {
  const data = await githubRequest<GithubRefJson>(
    `/repos/${owner}/${name}/git/ref/${encodeURIComponent(`heads/${branch}`)}`,
    { token },
  );
  return data.object.sha;
}

export async function branchExists(
  owner: string,
  name: string,
  branch: string,
  token: string,
): Promise<boolean> {
  try {
    await getBranchSha(owner, name, branch, token);
    return true;
  } catch (err) {
    if (err instanceof GithubApiError && err.status === 404) return false;
    throw err;
  }
}

export async function createBranch(
  owner: string,
  name: string,
  newBranch: string,
  fromSha: string,
  token: string,
): Promise<void> {
  await githubRequest(`/repos/${owner}/${name}/git/refs`, {
    token,
    method: "POST",
    body: { ref: `refs/heads/${newBranch}`, sha: fromSha },
  });
}

export async function upsertFile(
  owner: string,
  name: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  token: string,
  sha?: string,
): Promise<void> {
  await githubRequest(`/repos/${owner}/${name}/contents/${encodePath(path)}`, {
    token,
    method: "PUT",
    body: {
      message,
      content: toBase64(content),
      branch,
      ...(sha ? { sha } : {}),
    },
  });
}

export interface PullRequestResult {
  url: string;
  number: number;
}

interface GithubPullRequestJson {
  html_url: string;
  number: number;
}

export async function createPullRequest(
  owner: string,
  name: string,
  head: string,
  base: string,
  title: string,
  body: string,
  token: string,
): Promise<PullRequestResult> {
  const data = await githubRequest<GithubPullRequestJson>(`/repos/${owner}/${name}/pulls`, {
    token,
    method: "POST",
    body: { title, head, base, body },
  });
  return { url: data.html_url, number: data.number };
}

export interface GithubIdentity {
  login: string;
  avatarUrl: string;
}

interface GithubUserJson {
  login: string;
  avatar_url: string;
}

/** Resolve the GitHub user behind an access token (used right after OAuth login). */
export async function getAuthenticatedUser(token: string): Promise<GithubIdentity> {
  const data = await githubRequest<GithubUserJson>("/user", { token });
  return { login: data.login, avatarUrl: data.avatar_url };
}

/** Slugify a chat message into a short, safe git branch suffix. */
export function slugifyForBranch(input: string, maxLen = 40): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (slug || "change").slice(0, maxLen);
}
