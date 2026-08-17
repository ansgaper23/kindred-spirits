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
import { ensureProfile } from "@/lib/profile/profile.functions";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { user, session, loading } = useSupabaseUser();
  const runEnsureProfile = useServerFn(ensureProfile);
  const handledProfileFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (handledProfileFor.current !== user.id) {
      handledProfileFor.current = user.id;
      runEnsureProfile({
        data: {
          email: user.email ?? "",
          fullName: user.user_metadata?.["full_name"] ?? null,
          avatarUrl: user.user_metadata?.["avatar_url"] ?? null,
        },
      }).catch((err) => console.error("ensureProfile failed:", err));
    }
  }, [loading, user, session]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium tracking-wider uppercase">Iniciando sistemas...</p>
        </div>
      </div>
    );
  }

  const initials =
    (user.user_metadata?.["full_name"] as string | undefined)?.slice(0, 2).toUpperCase() ??
    user.email?.slice(0, 2).toUpperCase() ??
    "??";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-100">
      <style>{`
        @keyframes cf-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-24px) } }
        .cf-animate-float { animation: cf-float 8s ease-in-out infinite; }
        .cf-animate-float-delay { animation: cf-float 8s ease-in-out infinite; animation-delay: -4s; }
        .cf-grid-fade { mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 40%, transparent 100%); -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 40%, transparent 100%); }
      `}</style>
      
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div
          className="cf-grid-fade absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(34,211,238,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="cf-animate-float absolute -top-32 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="cf-animate-float-delay absolute top-1/4 -right-32 h-[400px] w-[400px] rounded-full bg-fuchsia-500/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
             <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_20px_-2px_rgba(34,211,238,0.5)]">
               CF
             </div>
             <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">CodeFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
            >
              <FolderGit2 className="w-4 h-4" />
              Repositorios
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                  <Avatar className="w-8 h-8 border border-white/10">
                    <AvatarImage src={user.user_metadata?.["avatar_url"]} alt={user.email ?? ""} />
                    <AvatarFallback className="bg-slate-800 text-slate-400">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                <DropdownMenuLabel className="truncate text-slate-400">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="text-slate-300 hover:text-cyan-300 focus:bg-white/5 cursor-pointer"
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
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Outlet />
      </main>
    </div>
  );
}
