import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { LogOut, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { ensureProfile, saveGithubToken } from "@/lib/profile/profile.functions";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { user, session, loading } = useSupabaseUser();
  const runEnsureProfile = useServerFn(ensureProfile);
  const runSaveGithubToken = useServerFn(saveGithubToken);
  const handledTokenFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    runEnsureProfile({
      data: {
        email: user.email ?? "",
        fullName: user.user_metadata?.["full_name"] ?? null,
        avatarUrl: user.user_metadata?.["avatar_url"] ?? null,
      },
    }).catch((err) => console.error("ensureProfile failed:", err));

    // A GitHub OAuth login exposes the provider token once, right after the
    // redirect. Persist it so later actions (listing/applying repo changes)
    // can use it without asking the user to paste anything.
    const providerToken = session?.provider_token ?? undefined;
    if (providerToken && handledTokenFor.current !== user.id) {
      handledTokenFor.current = user.id;
      runSaveGithubToken({ data: { providerToken } }).catch((err) =>
        console.error("saveGithubToken failed:", err),
      );
    }
  }, [loading, user, session]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const initials =
    (user.user_metadata?.["full_name"] as string | undefined)?.slice(0, 2).toUpperCase() ??
    user.email?.slice(0, 2).toUpperCase() ??
    "??";

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
            CF
          </div>
          CodeFlow
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <FolderGit2 className="w-4 h-4" />
            Repositorios
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.user_metadata?.["avatar_url"]} alt={user.email ?? ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Outlet />
      </main>
    </div>
  );
}
