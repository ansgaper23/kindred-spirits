import { createFileRoute } from "@tanstack/react-router";
import { ChatInterface } from "@/components/ChatInterface";
import { Github, FolderGit2, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<{ id: string, name: string } | null>(null);

  // Mock data for demo
  const mockRepos = [
    { id: '1', name: 'my-web-app', description: 'React + Tailwind project' },
    { id: '2', name: 'api-server', description: 'Node.js backend' },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Github className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to CodeFlow</CardTitle>
            <CardDescription>
              Connect your GitHub account to start shipping code with AI assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setIsConnected(true)}>
              <Github className="w-4 h-4 mr-2" />
              Connect GitHub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
            CF
          </div>
          CodeFlow
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setIsConnected(false)}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {!selectedRepo ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">Your Repositories</h2>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Connect New
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockRepos.map((repo) => (
                <Card key={repo.id} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedRepo(repo)}>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <FolderGit2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <CardTitle className="text-lg">{repo.name}</CardTitle>
                    </div>
                    <CardDescription>{repo.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end">
                      <Button variant="secondary" size="sm">Open</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedRepo(null)}>
                  &larr; Back
                </Button>
                <div className="flex items-center gap-2 font-medium">
                  <FolderGit2 className="w-4 h-4" />
                  {selectedRepo.name}
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                Branch: codeflow/main
              </div>
            </div>
            
            <ChatInterface repositoryId={selectedRepo.id} />
            
            <div className="w-full max-w-2xl text-center text-xs text-muted-foreground mt-4">
              Agent operations are performed in an isolated e2b sandbox. La base de datos que sea en supabase.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
