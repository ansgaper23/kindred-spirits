import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderGit2, Github, Loader2, Plus, Trash2, Lock, Globe } from "lucide-react";
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

  const repos = reposQuery.data?.repositories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tus repositorios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecta un repositorio para empezar a chatear con el agente.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Conectar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Conectar un repositorio</DialogTitle>
              <DialogDescription>
                Elige uno de tu cuenta de GitHub o pega el nombre de un repo público.
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
                  <div className="text-sm text-muted-foreground text-center py-6 space-y-2">
                    <Github className="w-6 h-6 mx-auto opacity-60" />
                    <p>Aún no conectaste tu cuenta de GitHub.</p>
                    <p className="text-xs">
                      Cierra sesión y vuelve a entrar con el botón "Continuar con GitHub", o usa la
                      pestaña de repo público.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1">
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
                    Solo repos públicos, salvo que hayas conectado tu cuenta de GitHub.
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
