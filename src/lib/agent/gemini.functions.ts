import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// Type-only import: erased at compile time, so this doesn't pull @google/genai
// into the client bundle — the real (runtime) import happens dynamically below.
import type { Content } from "@google/genai";

const MAX_TOOL_ITERATIONS = 6;
const MAX_FILE_CHARS = 12_000;

const inputSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(4000),
  repositoryId: z.string().uuid(),
  model: z.string().optional(),
});

interface ProposedEditOut {
  file_path: string;
  diff: string;
}

/**
 * Runs one turn of the CodeFlow agent: sends the user's message to Gemini
 * with function-calling tools that read the connected GitHub repo, lets the
 * model explore (list_files / read_file / search_code), and stops either on
 * a plain-text answer or on one-or-more propose_edit calls — which are
 * turned into real unified diffs and persisted as pending approvals.
 */
export const processAgentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      return {
        success: false as const,
        content:
          "El agente no está configurado todavía: falta la variable de entorno GEMINI_API_KEY (consíguela gratis en https://aistudio.google.com/apikey).",
        thought: undefined,
        proposedEdits: [],
        conversationId: data.conversationId ?? null,
      };
    }

    const { data: repo, error: repoError } = await context.supabase
      .from("repositories")
      .select("*")
      .eq("id", data.repositoryId)
      .single();
    if (repoError || !repo) throw new Error("Repositorio no encontrado o sin acceso.");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("github_access_token")
      .eq("id", context.userId)
      .maybeSingle();
    
    const { decryptSafe } = await import("@/lib/crypto.server");
    const githubToken = decryptSafe(profile?.github_access_token ?? null);

    // Resolve (or create) the conversation this message belongs to.
    let conversationId = data.conversationId ?? null;
    if (conversationId) {
      const { data: existing } = await context.supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!existing) conversationId = null;
    }
    if (!conversationId) {
      const { data: created, error: convError } = await context.supabase
        .from("conversations")
        .insert({
          repository_id: repo.id,
          user_id: context.userId,
          title: data.message.slice(0, 80),
        })
        .select("id")
        .single();
      if (convError || !created)
        throw new Error(convError?.message ?? "No se pudo crear la conversación.");
      conversationId = created.id;
    }

    await context.supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: data.message,
    });

    const github = await import("@/lib/github/client.server");
    const { GoogleGenAI } = await import("@google/genai");
    const { createTwoFilesPatch } = await import("diff");

    const genAI = new GoogleGenAI({ apiKey });
    
    // Normalize model name for the SDK (remove 'models/' prefix if present, as the SDK adds it)
    let modelName = data.model || process.env["GEMINI_MODEL"] || "gemini-1.5-flash";
    if (modelName.startsWith("models/")) {
      modelName = modelName.replace("models/", "");
    }

    const systemInstruction = [
      "You are the CodeFlow agent, a careful senior engineer pair-programming inside a chat UI.",
      `You are working on the GitHub repository ${repo.full_name} (default branch: ${repo.default_branch}).`,
      "Use list_files/read_file/search_code to explore before proposing anything — never guess file contents.",
      "When you're ready to make a change, call propose_edit with the file's complete new content. You may call it more than once for multi-file changes.",
      "If the request is unclear or too broad, ask a clarifying question in plain text instead of calling propose_edit.",
      "Keep prose replies short. Reply in the same language the user wrote in.",
    ].join("\n");

    const tools = [
      {
        functionDeclarations: [
          {
            name: "list_files",
            description:
              "List files and folders at a path in the repository (empty path = repo root).",
            parameters: {
              type: "OBJECT" as any,
              properties: {
                path: {
                  type: "STRING",
                  description: "Directory path, e.g. 'src/components'. Empty for root.",
                },
              },
            },
          },
          {
            name: "read_file",
            description: "Read the text content of a single file in the repository.",
            parameters: {
              type: "OBJECT" as any,
              properties: {
                path: { type: "STRING", description: "File path, e.g. 'src/App.tsx'." },
              },
              required: ["path"],
            },
          },
          {
            name: "search_code",
            description: "Search the repository's code for a string or symbol.",
            parameters: {
              type: "OBJECT" as any,
              properties: { query: { type: "STRING" } },
              required: ["query"],
            },
          },
          {
            name: "propose_edit",
            description:
              "Propose a change to a file for the user to review and approve. Provide the FULL new content of the file (not a diff). Call this once per file you want to change, only after you've read the file's current content.",
            parameters: {
              type: "OBJECT" as any,
              properties: {
                file_path: { type: "STRING" },
                new_content: { type: "STRING", description: "The complete new file content." },
                summary: { type: "STRING", description: "One sentence describing the change." },
              },
              required: ["file_path", "new_content", "summary"],
            },
          },
        ],
      },
    ];

    async function executeTool(
      name: string,
      args: Record<string, unknown> | undefined,
    ): Promise<unknown> {
      try {
        if (!repo) throw new Error("Repositorio no encontrado.");
        const path = typeof args?.["path"] === "string" ? args["path"] : "";
        switch (name) {
          case "list_files": {
            const entries = await github.listDirectory(
              repo.owner,
              repo.name,
              path,
              repo.default_branch,
              githubToken,
            );
            return { entries: entries.map((e) => ({ path: e.path, type: e.type })) };
          }
          case "read_file": {
            const file = await github.getFileContent(
              repo.owner,
              repo.name,
              path,
              repo.default_branch,
              githubToken,
            );
            const truncated = file.content.length > MAX_FILE_CHARS;
            return {
              path,
              content: truncated ? file.content.slice(0, MAX_FILE_CHARS) : file.content,
              truncated,
            };
          }
          case "search_code": {
            const query = typeof args?.["query"] === "string" ? args["query"] : "";
            const results = await github.searchCode(repo.owner, repo.name, query, githubToken);
            return { results };
          }
          default:
            return { error: `Unknown tool ${name}` };
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    }

    const toolLog: string[] = [];
    let finalText = "";
    const editCalls: Array<{ file_path: string; new_content: string; summary: string }> = [];

    // Using the generateContent method directly as supported by @google/genai 2.17.1
    let contents: any[] = [{ role: "user", parts: [{ text: data.message }] }];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      console.log(`[Agent] Iteration ${iteration} starting...`);
      let response;
      try {
        // Correct usage for this SDK version: models.generateContent(request)
        response = await (genAI as any).models.generateContent({
          model: modelName,
          contents,
          systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
          tools: tools?.[0]?.functionDeclarations ? [
            { functionDeclarations: tools[0].functionDeclarations.map(fd => ({ ...fd, parameters: fd.parameters as any })) }
          ] : tools,
        });
        console.log(`[Agent] Iteration ${iteration} response received.`);
      } catch (err: any) {
        console.error(`[Agent] Iteration ${iteration} failed:`, err);
        // If it's a validation error or something we can report to user
        const errorMessage = err?.message || String(err);
        if (errorMessage.includes("400") || errorMessage.includes("invalid")) {
           return {
            success: false as const,
            content: `Error de la IA: ${errorMessage}`,
            thought: toolLog.length > 0 ? toolLog.join("\n") : undefined,
            conversationId,
          };
        }
        throw err;
      }

      // Response structure: GenerateContentResponse
      // candidate is generated content
      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        throw new Error("No response from AI model.");
      }

      if (candidate.finishReason === "SAFETY") {
        return {
          success: false as const,
          content: "La IA bloqueó la respuesta por motivos de seguridad.",
          thought: toolLog.length > 0 ? toolLog.join("\n") : undefined,
          conversationId,
        };
      }

      contents.push(modelContent);

      const calls = candidate?.content?.parts
        ?.filter((p: any) => p.functionCall)
        ?.map((p: any) => p.functionCall) || [];

      if (calls.length === 0) {
        finalText = candidate?.content?.parts
          ?.filter((p: any) => p.text)
          ?.map((p: any) => p.text)
          ?.join("") || "";
        break;
      }

      const proposals = calls.filter((c: any) => c.name === "propose_edit");
      if (proposals.length > 0) {
        const summaries: string[] = [];
        for (const call of proposals) {
          const args = (call.args as any) ?? {};
          const filePath = typeof args["file_path"] === "string" ? args["file_path"] : "";
          const newContent = typeof args["new_content"] === "string" ? args["new_content"] : "";
          const summary = typeof args["summary"] === "string" ? args["summary"] : "";
          if (!filePath) continue;
          editCalls.push({ file_path: filePath, new_content: newContent, summary });
          if (summary) summaries.push(summary);
        }
        finalText = summaries.join(" ") || "Aquí tienes los cambios propuestos.";
        break;
      }

      const toolParts: any[] = [];
      for (const call of calls) {
        if (!call.name) continue;
        toolLog.push(`${call.name}(${JSON.stringify(call.args ?? {})})`);
        const toolResult = await executeTool(call.name, call.args as any);
        toolParts.push({
          functionResponse: {
            name: call.name,
            response: { result: toolResult },
          },
        });
      }

      contents.push({ role: "user", parts: toolParts });

      if (iteration === MAX_TOOL_ITERATIONS - 1) {
        finalText = "No pude terminar de explorar el repositorio en el tiempo asignado. ¿Puedes ser más específico?";
      }
    }

    // Turn each propose_edit call into a real unified diff against the
    // current file content (or against an empty file, for new files).
    const proposedEdits: ProposedEditOut[] = [];
    const { data: assistantMessage, error: msgError } = await context.supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: finalText,
        thought: toolLog.length > 0 ? toolLog.join("\n") : null,
      })
      .select("id")
      .single();
    if (msgError || !assistantMessage)
      throw new Error(msgError?.message ?? "No se pudo guardar la respuesta.");

    for (const edit of editCalls) {
      const existing = await github.tryGetFileContent(
        repo.owner,
        repo.name,
        edit.file_path,
        repo.default_branch,
        githubToken,
      );
      const diff = createTwoFilesPatch(
        edit.file_path,
        edit.file_path,
        existing?.content ?? "",
        edit.new_content,
        existing ? undefined : "(new file)",
        undefined,
      );

      const { data: editRow, error: editError } = await context.supabase
        .from("proposed_edits")
        .insert({
          message_id: assistantMessage.id,
          file_path: edit.file_path,
          diff,
          new_content: edit.new_content,
        })
        .select("id, file_path, diff")
        .single();
      if (editError || !editRow)
        throw new Error(editError?.message ?? "No se pudo guardar el cambio propuesto.");

      proposedEdits.push({ file_path: editRow.file_path, diff: editRow.diff });
    }

    return {
      success: true as const,
      content: finalText,
      thought: toolLog.length > 0 ? toolLog.join("\n") : undefined,
      proposedEdits,
      conversationId,
    };
  });
