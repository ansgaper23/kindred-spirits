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
    <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            to="/dashboard" 
            className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            &larr; Repositorios
          </Link>
          <span className="text-slate-700">/</span>
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center">
              <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            {repo.full_name}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 px-2 py-0.5 rounded tracking-wider uppercase">
            {repo.default_branch}
          </span>
          {repo.html_url && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-white/5" asChild>
              <a href={repo.html_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <ChatInterface repositoryId={repo.id} />

      <div className="w-full max-w-3xl text-center text-[10px] font-medium text-slate-500 mt-2 uppercase tracking-[0.2em] opacity-50">
        El agente explora el código vía la API de GitHub y propone diffs · nada se aplica sin tu aprobación
      </div>
    </div>
  );
}
