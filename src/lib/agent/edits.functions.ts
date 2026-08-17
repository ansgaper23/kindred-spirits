import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Approve (commit + open a PR) or reject a proposed edit. RLS ensures the
 * `proposed_edits` row is only reachable if it belongs to a message in one
 * of the current user's conversations, so no extra ownership check is
 * needed beyond the query itself.
 */
export const approveAndApplyEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        editId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: edit, error: editError } = await context.supabase
      .from("proposed_edits")
      .select("id, file_path, new_content, status, message_id")
      .eq("id", data.editId)
      .single();
    if (editError || !edit) throw new Error("No se encontró el cambio propuesto.");
    if (edit.status === "applied") {
      return { success: true as const, message: "Este cambio ya se había aplicado." };
    }

    if (data.action === "reject") {
      const { error } = await context.supabase
        .from("proposed_edits")
        .update({ status: "rejected" })
        .eq("id", edit.id);
      if (error) throw new Error(error.message);
      return { success: true as const, message: "Cambio rechazado." };
    }

    if (edit.new_content == null) {
      throw new Error(
        "Este cambio no tiene contenido para aplicar (¿fue creado antes de esta versión?).",
      );
    }

    const { data: message } = await context.supabase
      .from("messages")
      .select("conversation_id")
      .eq("id", edit.message_id)
      .single();
    if (!message) throw new Error("No se encontró la conversación asociada.");

    const { data: conversation } = await context.supabase
      .from("conversations")
      .select("repository_id")
      .eq("id", message.conversation_id)
      .single();
    if (!conversation) throw new Error("No se encontró el repositorio asociado.");

    const { data: repo } = await context.supabase
      .from("repositories")
      .select("*")
      .eq("id", conversation.repository_id)
      .single();
    if (!repo) throw new Error("Repositorio no encontrado.");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("github_access_token")
      .eq("id", context.userId)
      .maybeSingle();
    
    const { decryptSafe } = await import("@/lib/crypto.server");
    const token = decryptSafe(profile?.github_access_token ?? null);
    if (!token) {
      return {
        success: false as const,
        message:
          "Necesitas conectar tu cuenta de GitHub (inicia sesión con GitHub) para poder aplicar cambios y abrir un Pull Request.",
      };
    }

    const github = await import("@/lib/github/client.server");

    try {
      const baseSha = await github.getBranchSha(repo.owner, repo.name, repo.default_branch, token);
      const branchSlug = github.slugifyForBranch(edit.file_path);
      let branchName = `codeflow/${branchSlug}-${edit.id.slice(0, 8)}`;
      if (await github.branchExists(repo.owner, repo.name, branchName, token)) {
        branchName = `${branchName}-${Date.now().toString(36)}`;
      }
      await github.createBranch(repo.owner, repo.name, branchName, baseSha, token);

      const existingFile = await github.tryGetFileContent(
        repo.owner,
        repo.name,
        edit.file_path,
        branchName,
        token,
      );
      await github.upsertFile(
        repo.owner,
        repo.name,
        edit.file_path,
        edit.new_content,
        `CodeFlow: update ${edit.file_path}`,
        branchName,
        token,
        existingFile?.sha,
      );

      const pr = await github.createPullRequest(
        repo.owner,
        repo.name,
        branchName,
        repo.default_branch,
        `CodeFlow: update ${edit.file_path}`,
        `Cambio propuesto por el agente de CodeFlow en \`${edit.file_path}\`.\n\nRevisa el diff antes de mergear.`,
        token,
      );

      const { error: updateError } = await context.supabase
        .from("proposed_edits")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", edit.id);
      if (updateError) throw new Error(updateError.message);

      return {
        success: true as const,
        message: `Cambios aplicados. Se creó la rama '${branchName}' y se abrió un Pull Request.`,
        prUrl: pr.url,
      };
    } catch (err) {
      console.error("Failed to apply edit:", err);
      const detail =
        err instanceof github.GithubApiError ? err.message : "Error al comunicarse con GitHub.";
      return { success: false as const, message: `No se pudo aplicar el cambio: ${detail}` };
    }
  });
