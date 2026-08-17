import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Github,
  MessageSquare,
  GitPullRequest,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Terminal,
  Zap,
  GitBranch,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

export const Route = createFileRoute("/")({
  component: Home,
});

const STEPS = [
  {
    icon: Github,
    title: "Conecta tu repositorio",
    description:
      "Con tu cuenta de GitHub o pegando el nombre de un repo público. Nada se toca todavía.",
  },
  {
    icon: MessageSquare,
    title: "Describe el cambio",
    description:
      "Chatea en lenguaje natural con el agente. Explora tu código real, no inventa nada.",
  },
  {
    icon: GitPullRequest,
    title: "Revisa y aprueba",
    description:
      "Ves el diff exacto antes de aplicarlo. Solo al aprobar se crea la rama y el Pull Request.",
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: "Agente con Gemini",
    description:
      "Explora archivos, busca código y propone ediciones usando function calling real, no respuestas de relleno.",
  },
  {
    icon: ShieldCheck,
    title: "Tú tienes el control",
    description:
      "El agente nunca escribe directo a tu rama principal. Todo pasa por una rama nueva y un PR que tú apruebas.",
  },
  {
    icon: GitBranch,
    title: "Integración real con GitHub",
    description:
      "Lectura y escritura vía la API de GitHub: listar archivos, leer contenido, comitear cambios y abrir PRs.",
  },
];

function Home() {
  const { user, loading } = useSupabaseUser();
  const primaryHref = !loading && user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-100">
      <style>{`
        @keyframes cf-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-24px) } }
        @keyframes cf-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        @keyframes cf-pulse-dot { 0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.6) } 50% { box-shadow: 0 0 0 6px rgba(34,211,238,0) } }
        .cf-animate-float { animation: cf-float 8s ease-in-out infinite; }
        .cf-animate-float-delay { animation: cf-float 8s ease-in-out infinite; animation-delay: -4s; }
        .cf-cursor::after { content: ""; display: inline-block; width: 7px; height: 1em; margin-left: 2px; background: currentColor; vertical-align: text-bottom; animation: cf-blink 1s step-end infinite; }
        .cf-dot { animation: cf-pulse-dot 2s infinite; }
        .cf-grid-fade { mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 40%, transparent 100%); -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 40%, transparent 100%); }
      `}</style>

      {/* Ambient background: grid + glow orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-slate-950" />
        <div
          className="cf-grid-fade absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.08) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="cf-animate-float absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[110px]" />
        <div className="cf-animate-float-delay absolute top-1/4 -right-32 h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-blue-600/10 blur-[110px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_20px_-2px_rgba(34,211,238,0.7)]">
              CF
            </div>
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              CodeFlow
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            <a href="#how" className="transition-colors hover:text-cyan-300">
              Cómo funciona
            </a>
            <a href="#why" className="transition-colors hover:text-cyan-300">
              Por qué CodeFlow
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <Button
                asChild
                size="sm"
                className="border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)] hover:from-cyan-400 hover:to-blue-500"
              >
                <Link to="/dashboard">Ir al dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-slate-300 hover:bg-white/5 hover:text-cyan-300"
                >
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)] hover:from-cyan-400 hover:to-blue-500"
                >
                  <Link to="/signup">Empezar gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center md:py-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300 backdrop-blur-sm">
          <span className="cf-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <Sparkles className="h-3 w-3" />
          Impulsado por Gemini · function calling real
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Edita tu código de{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
            GitHub
          </span>{" "}
          conversando con IA
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-slate-400">
          Conecta un repositorio, describe el cambio que quieres y revisa el diff antes de
          aprobarlo. Ningún cambio se aplica sin tu confirmación.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            size="lg"
            asChild
            className="border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_30px_-6px_rgba(34,211,238,0.8)] hover:from-cyan-400 hover:to-blue-500"
          >
            <Link to={primaryHref}>
              {!loading && user ? "Ir al dashboard" : "Empezar gratis"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {!(!loading && user) && (
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/15 bg-white/5 text-slate-200 backdrop-blur-sm hover:border-cyan-400/40 hover:bg-white/10 hover:text-cyan-200"
            >
              <Link to="/login">Ya tengo cuenta</Link>
            </Button>
          )}
        </div>

        {/* Terminal / chat mock */}
        <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 text-left shadow-[0_0_60px_-15px_rgba(34,211,238,0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Terminal className="h-3 w-3" />
              agente · ansgaper23/kindred-spirits
            </span>
          </div>
          <div className="space-y-3 p-5 font-mono text-[13px] leading-relaxed">
            <p className="text-slate-500">$ Añade validación de email al formulario de login</p>
            <p className="text-cyan-300">
              <span className="text-fuchsia-400">agente&gt;</span> leyendo{" "}
              <span className="text-slate-300">src/routes/login.tsx</span>…
            </p>
            <p className="text-cyan-300">
              <span className="text-fuchsia-400">agente&gt;</span> propone un cambio en{" "}
              <span className="text-slate-300">login.tsx</span>
            </p>
            <p className="text-emerald-400">
              + if (!isValidEmail(email)) return toast.error(&quot;Email inválido&quot;);
            </p>
            <p className="text-slate-500 cf-cursor">esperando tu aprobación</p>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="container mx-auto scroll-mt-20 border-t border-white/10 px-4 py-16"
      >
        <h2 className="mb-12 text-center text-2xl font-semibold">
          Cómo{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            funciona
          </span>
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all hover:border-cyan-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_30px_-10px_rgba(34,211,238,0.5)]"
            >
              <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950 shadow-[0_0_15px_-2px_rgba(34,211,238,0.8)]">
                {i + 1}
              </div>
              <step.icon className="mb-3 h-6 w-6 text-cyan-400" />
              <h3 className="mb-1.5 font-semibold text-slate-100">{step.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="why"
        className="container mx-auto scroll-mt-20 border-t border-white/10 px-4 py-16"
      >
        <h2 className="mb-12 text-center text-2xl font-semibold">
          Por qué{" "}
          <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            CodeFlow
          </span>
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all hover:border-fuchsia-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_30px_-10px_rgba(217,70,239,0.4)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 text-cyan-300 ring-1 ring-white/10">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold text-slate-100">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto border-t border-white/10 px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-10 shadow-[0_0_60px_-20px_rgba(34,211,238,0.4)] backdrop-blur-sm">
          <Zap className="mx-auto mb-4 h-8 w-8 text-cyan-400" />
          <h2 className="mb-4 text-2xl font-semibold md:text-3xl">
            Conecta tu primer repositorio en un minuto
          </h2>
          <Button
            size="lg"
            asChild
            className="border-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_30px_-6px_rgba(34,211,238,0.8)] hover:from-cyan-400 hover:to-blue-500"
          >
            <Link to={primaryHref}>
              {!loading && user ? "Ir al dashboard" : "Crear cuenta gratis"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        CodeFlow · dame el Personal Access Token de supabase, para poder manejarlo desde mi ia clause
      </footer>
    </div>
  );
}
