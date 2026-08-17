import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Github,
  MessageSquare,
  GitPullRequest,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    icon: Sparkles,
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
    icon: GitPullRequest,
    title: "Integración real con GitHub",
    description:
      "Lectura y escritura vía la API de GitHub: listar archivos, leer contenido, comitear cambios y abrir PRs.",
  },
];

function Home() {
  const { user, loading } = useSupabaseUser();
  const primaryHref = !loading && user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
              CF
            </div>
            CodeFlow
          </div>
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Ir al dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Empezar gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="w-3 h-3" />
          Impulsado por Gemini · function calling real
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto text-balance">
          Edita tu código de GitHub conversando con IA
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto text-balance">
          Conecta un repositorio, describe el cambio que quieres y revisa el diff antes de
          aprobarlo. Ningún cambio se aplica sin tu confirmación.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to={primaryHref}>
              {!loading && user ? "Ir al dashboard" : "Empezar gratis"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          {!(!loading && user) && (
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Ya tengo cuenta</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-12">Cómo funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="relative">
              <CardContent className="pt-6">
                <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <step.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-12">Por qué CodeFlow</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="space-y-2">
              <feature.icon className="w-6 h-6 text-primary" />
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 border-t text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          Conecta tu primer repositorio en un minuto
        </h2>
        <Button size="lg" asChild>
          <Link to={primaryHref}>
            {!loading && user ? "Ir al dashboard" : "Crear cuenta gratis"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        CodeFlow · construido con Lovable, TanStack Start y Supabase
      </footer>
    </div>
  );
}
