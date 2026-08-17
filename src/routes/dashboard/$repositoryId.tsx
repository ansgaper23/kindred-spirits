import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderGit2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { getRepository } from "@/lib/repos/repos.functions";

export const Route = createFileRoute("/dashboard/$repositoryId")({
  component: RepositoryChat,
});

function RepositoryChat() {
  const { repositoryId } = Route.useParams();
  const runGetRepository = useServerFn(getRepository);

  const repoQuery = useQuery({
    queryKey: ["repository", repositoryId],
    queryFn: () => runGetRepository({ data: { repositoryId } }),
  });

  if (repoQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (repoQuery.isError || !repoQuery.data) {
    return (
      <p className="text-center text-sm text-muted-foreground py-16">
        No se encontró este repositorio.
      </p>
    );
  }

  const repo = repoQuery.data.repository;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Repositorios
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2 font-medium">
            <FolderGit2 className="w-4 h-4" />
            {repo.full_name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
            Rama base: {repo.default_branch}
          </span>
          {repo.html_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={repo.html_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <ChatInterface repositoryId={repo.id} />

      <div className="w-full max-w-3xl text-center text-xs text-muted-foreground mt-2">
        El agente explora el código directamente vía la API de GitHub y propone diffs — nada se
        aplica sin tu aprobación.
      </div>
    </div>
  );
}
