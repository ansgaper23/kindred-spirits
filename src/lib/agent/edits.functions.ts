import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Server function to handle diff approval and PR creation.
 */
export const approveAndApplyEdit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({
      editId: z.string().uuid(),
      action: z.enum(['approve', 'reject']),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { editId, action } = data;
    
    console.log(`[Edits] Action: ${action} on edit ${editId}`);
    
    // 1. Update status in database
    const { error } = await supabase
      .from('proposed_edits')
      .update({ 
        status: action === 'approve' ? 'applied' : 'rejected',
        applied_at: action === 'approve' ? new Date().toISOString() : null
      })
      .eq('id', editId);

    if (error) {
      console.error("[Edits] Update error:", error);
      return { success: false, error: error.message };
    }

    // 2. Simulate GitHub/Sandbox activity
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (action === 'approve') {
      return {
        success: true,
        message: "Changes applied successfully! Created branch 'codeflow/patch-1' and opened a Pull Request.",
        prUrl: "https://github.com/lovable/codeflow-demo/pull/1"
      };
    }

    return {
      success: true,
      message: "Edit rejected."
    };
  });
