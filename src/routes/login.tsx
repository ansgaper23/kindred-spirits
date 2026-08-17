import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message,
      );
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-2 flex items-center gap-2 font-bold text-lg w-fit">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm">
              CF
            </div>
            CodeFlow
          </Link>
          <CardTitle className="text-xl">Inicia sesión</CardTitle>
          <CardDescription>Entra a tu cuenta para ver tus repositorios conectados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          ¿No tienes cuenta?&nbsp;
          <Link to="/signup" className="text-primary hover:underline">
            Regístrate
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
