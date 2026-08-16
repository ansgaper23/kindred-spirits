import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Server function to handle the agent loop with Gemini.
 * Coordinates Gemini API calls and e2b sandbox execution.
 */
export const processAgentMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({
      conversationId: z.string().uuid(),
      message: z.string(),
      repositoryId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { conversationId, message, repositoryId } = data;
    
    // 1. Get user session to identify the user
    // Note: requireSupabaseAuth middleware would handle this more robustly,
    // but we'll start with basic integration.
    
    console.log(`[Agent] Processing: "${message}" for repo ${repositoryId}`);

    // 2. Mocking the Agent Loop for MVP
    // In production, this would:
    // - Initialize Gemini with tools (read_file, propose_edit, etc.)
    // - Initialize e2b sandbox
    // - Execute the loop until a final answer or proposed edit is reached
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const assistantResponse = {
      role: 'assistant' as const,
      content: "I've analyzed the repository. I recommend adding email validation to the registration form. I've prepared a diff for your review.",
      thought: "The user wants email validation. I checked `src/components/RegistrationForm.tsx` and found the `onSubmit` handler needs a regex check.",
      proposedEdits: [
        {
          file_path: 'src/components/RegistrationForm.tsx',
          diff: `--- src/components/RegistrationForm.tsx
+++ src/components/RegistrationForm.tsx
@@ -10,1 +10,6 @@
   const onSubmit = (data) => {
+    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
+    if (!emailRegex.test(data.email)) {
+      setError("Please enter a valid email address");
+      return;
+    }
     console.log("Form submitted:", data);`
        }
      ]
    };

    // 3. Store messages in database if conversation exists
    try {
      // Save User Message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });

      // Save Assistant Message
      const { data: msgData, error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantResponse.content,
        thought: assistantResponse.thought
      }).select().single();

      if (!msgError && msgData && assistantResponse.proposedEdits) {
        // Save Proposed Edits
        for (const edit of assistantResponse.proposedEdits) {
          await supabase.from('proposed_edits').insert({
            message_id: msgData.id,
            file_path: edit.file_path,
            diff: edit.diff,
            status: 'pending'
          });
        }
      }
    } catch (e) {
      console.error("[Agent] DB storage error:", e);
      // Continue anyway to return the response to the user
    }

    return {
      success: true,
      ...assistantResponse
    };
  });
