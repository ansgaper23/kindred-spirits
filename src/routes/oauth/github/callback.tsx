import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/github/callback")({
  component: GithubOAuthCallback,
  head: () => ({
    meta: [
      { title: "Conectando GitHub · CodeFlow" },
      { name: "description", content: "Finalizando la autorización de tu cuenta de GitHub." },
      { property: "og:title", content: "Conectando GitHub · CodeFlow" },
      { property: "og:description", content: "Finalizando la autorización de tu cuenta de GitHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function GithubOAuthCallback() {
  const [message, setMessage] = useState("Finalizando la conexión con GitHub…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error_description") ?? params.get("error");

    const notify = (payload: Record<string, unknown>) => {
      window.opener?.postMessage({ source: "codeflow-github-oauth", ...payload }, window.location.origin);
      window.close();
    };

    if (error || !code || !state) {
      setMessage(error ?? "GitHub no devolvió un código de autorización.");
      notify({ ok: false, error: error ?? "Autorización incompleta." });
      return;
    }

    notify({ ok: true, code, state });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <p className="text-slate-300">{message}</p>
    </div>
  );
}
