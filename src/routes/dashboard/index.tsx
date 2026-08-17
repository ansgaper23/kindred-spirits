import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FolderGit2,
  Loader2,
  Plus,
  Trash2,
  Lock,
  Globe,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Github,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  listRepositories,
  listGithubRepos,
  connectRepository,
  disconnectRepository,
} from "@/lib/repos/repos.functions";
import { ensureProfile, disconnectGithub } from "@/lib/profile/profile.functions";
import { startGithubOAuth, completeGithubOAuth } from "@/lib/github/oauth.functions";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualFullName, setManualFullName] = useState("");

  const runListRepositories = useServerFn(listRepositories);
  const runListGithubRepos = useServerFn(listGithubRepos);
  const runConnectRepository = useServerFn(connectRepository);
  const runDisconnectRepository = useServerFn(disconnectRepository);
  const runEnsureProfile = useServerFn(ensureProfile);
  const runDisconnectGithub = useServerFn(disconnectGithub);
  const runStartGithubOAuth = useServerFn(startGithubOAuth);
  const runCompleteGithubOAuth = useServerFn(completeGithubOAuth);


  const reposQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => runListRepositories(),
  });

  const githubReposQuery = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => runListGithubRepos(),
    enabled: dialogOpen,
  });

  const connectMutation = useMutation({
    mutationFn: (fullName: string) => runConnectRepository({ data: { fullName } }),
    onSuccess: () => {
      toast.success("Repositorio conectado.");
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      setDialogOpen(false);
      setManualFullName("");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "No se pudo conectar el repositorio."),
  });

  const disconnectMutation = useMutation({
    mutationFn: (repositoryId: string) => runDisconnectRepository({ data: { repositoryId } }),
    onSuccess: () => {
      toast.success("Repositorio desconectado.");
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
    onError: () => toast.error("No se pudo desconectar el repositorio."),
  });

  const githubLoginMutation = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "codeflow-github-oauth", "width=620,height=760");
      if (!popup) throw new Error("El navegador bloqueó la ventana emergente. Permítela e intenta de nuevo.");

      try {
        const { authorizationUrl } = await runStartGithubOAuth();
        const completion = new Promise<{ code: string; state: string }>((resolve, reject) => {
          let poll: number | undefined;
          const cleanup = () => {
            window.removeEventListener("message", onMessage);
            if (poll !== undefined) window.clearInterval(poll);
          };
          const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.source !== "codeflow-github-oauth") return;
            cleanup();
            if (event.data.ok) resolve({ code: event.data.code, state: event.data.state });
            else reject(new Error(event.data.error ?? "La autorización falló."));
          };
          window.addEventListener("message", onMessage);
          poll = window.setInterval(() => {
            if (popup.closed) {
              cleanup();
              reject(new Error("Cerraste la ventana antes de terminar."));
            }
          }, 500);
        });
        popup.location.href = authorizationUrl;
        const { code, state } = await completion;
        return await runCompleteGithubOAuth({ data: { code, state } });
      } catch (err) {
        popup.close();
        throw err;
      }
    },
    onSuccess: (result) => {
      toast.success(`GitHub conectado como @${result.githubUsername}.`);
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar la conexión con GitHub."),
  });


  const disconnectGithubMutation = useMutation({
    mutationFn: () => runDisconnectGithub(),
    onSuccess: () => {
      toast.success("Cuenta de GitHub desconectada.");
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
    onError: () => toast.error("No se pudo desconectar GitHub."),
  });

  const repos = reposQuery.data?.repositories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Dashboard
        </h2>
        <p className="text-sm text-slate-400">
          Conecta tu cuenta de GitHub (OAuth) y habla con el agente de IA.
        </p>
      </div>

      <Card className="bg-slate-900/40 border-white/10 backdrop-blur-md overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Github className="w-6 h-6 text-slate-100" />
              <h3 className="text-lg font-bold text-slate-100">GitHub OAuth App</h3>
            </div>
            {githubReposQuery.data?.connected ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado (@{githubReposQuery.data.username})
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase tracking-widest w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                No conectado
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 h-10 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
              onClick={() => githubReposQuery.data?.connected ? setDialogOpen(true) : githubLoginMutation.mutate()}
              disabled={githubLoginMutation.isPending}
            >
              {githubLoginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Github className="w-4 h-4 mr-2" />}
              {githubReposQuery.data?.connected ? "Añadir repositorio" : "Conectar GitHub"}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="h-10 w-auto px-4 bg-slate-950/50 border-white/10 text-slate-100 hover:bg-white/5 transition-all"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["github-repos"] })}
              disabled={githubReposQuery.isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", githubReposQuery.isLoading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mt-12 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Tus repositorios</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los repositorios conectados al agente.
          </p>
        </div>
        {!githubReposQuery.isLoading && repos.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Añadir más
          </Button>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-slate-100">
            <DialogHeader>
              <DialogTitle>Conectar un repositorio</DialogTitle>
              <DialogDescription>
                Elige uno de tu cuenta de GitHub (vía OAuth App) o pega el nombre de un repo público.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue={githubReposQuery.data?.connected ? "github" : "manual"}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="github">Tu GitHub</TabsTrigger>
                <TabsTrigger value="manual">Repo público</TabsTrigger>
              </TabsList>
              <TabsContent value="github" className="space-y-3 pt-2">
                {githubReposQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !githubReposQuery.data?.connected ? (
                   <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground text-center space-y-2">
                      <Github className="w-8 h-8 mx-auto opacity-60 mb-1" />
                      <p>Conecta tu cuenta mediante la aplicación oficial de GitHub para acceder a tus repositorios.</p>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-500"
                      disabled={githubLoginMutation.isPending}
                      onClick={() => githubLoginMutation.mutate()}
                    >
                      {githubLoginMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Conectar GitHub (OAuth)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Conectado
                        {githubReposQuery.data?.username && (
                          <span className="font-medium text-foreground">
                            @{githubReposQuery.data.username}
                          </span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        disabled={disconnectGithubMutation.isPending}
                        onClick={() => disconnectGithubMutation.mutate()}
                      >
                        Desconectar
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {(githubReposQuery.data?.repos ?? []).map((repo) => (
                        <button
                          key={repo.fullName}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between gap-2 text-sm disabled:opacity-50"
                          disabled={connectMutation.isPending}
                          onClick={() => connectMutation.mutate(repo.fullName)}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {repo.private ? (
                              <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate">{repo.fullName}</span>
                          </span>
                        </button>
                      ))}
                      {(githubReposQuery.data?.repos ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No encontramos repositorios en tu cuenta.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="manual" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">owner/repo</Label>
                  <Input
                    id="fullName"
                    placeholder="ej. facebook/react"
                    value={manualFullName}
                    onChange={(e) => setManualFullName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo repos públicos, salvo que hayas autorizado la GitHub OAuth App.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    className="w-full"
                    disabled={!manualFullName.trim() || connectMutation.isPending}
                    onClick={() => connectMutation.mutate(manualFullName.trim())}
                  >
                    {connectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Conectar repositorio
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {reposQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : repos.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center text-center gap-3">
            <FolderGit2 className="w-10 h-10 text-muted-foreground/50" />
            <p className="font-medium">Todavía no conectaste ningún repositorio</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Conecta uno para empezar a describirle cambios en lenguaje natural al agente.
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Conectar repositorio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo) => (
            <Card
              key={repo.id}
              className="hover:border-primary/50 transition-colors group relative"
            >
              <Link
                to="/dashboard/$repositoryId"
                params={{ repositoryId: repo.id }}
                className="block"
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FolderGit2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <CardTitle className="text-lg truncate">{repo.name}</CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-10">
                    {repo.description || "Sin descripción"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-muted-foreground">
                    {repo.owner}/{repo.name} · rama {repo.default_branch}
                  </span>
                </CardContent>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={disconnectMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  disconnectMutation.mutate(repo.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
