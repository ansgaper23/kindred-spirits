import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, ChevronRight, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useServerFn } from "@tanstack/react-start";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processAgentMessage } from "@/lib/agent/gemini.functions";
import { approveAndApplyEdit } from "@/lib/agent/edits.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProposedEdit {
  id?: string;
  file_path: string;
  diff: string;
  status?: "pending" | "approved" | "rejected" | "applied";
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string | undefined;
  proposedEdits?: ProposedEdit[] | undefined;
}

export function ChatInterface({ repositoryId }: { repositoryId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your CodeFlow agent. How can I help you with your code today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyingEditId, setApplyingEditId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const scrollRef = useRef<HTMLDivElement>(null);

  const processMessage = useServerFn(processAgentMessage);
  const handleEditAction = useServerFn(approveAndApplyEdit);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      const response = await processMessage({
        data: {
          conversationId,
          message: input,
          repositoryId,
          model: selectedModel,
        },
      });

      if (response.conversationId) setConversationId(response.conversationId);

      const newMessage: Message = {
        role: response.success ? "assistant" : "system",
        content: response.content,
        thought: response.thought || undefined,
        proposedEdits:
          response.success && response.proposedEdits?.length
            ? response.proposedEdits.map((e: ProposedEdit) => ({
                ...e,
                id: crypto.randomUUID(),
                status: "pending" as const,
              }))
            : undefined,
      };
      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error("Failed to process message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Sorry, I encountered an error while processing your request.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const onEditAction = async (editId: string, action: "approve" | "reject") => {
    setApplyingEditId(editId);
    try {
      const result = await handleEditAction({
        data: { editId, action },
      });
      if (result.success) {
        if (action === "approve") {
          toast.success(result.message, {
            action: result.prUrl
              ? {
                  label: "View PR",
                  onClick: () => window.open(result.prUrl!, "_blank"),
                }
              : undefined,
          });
        } else {
          toast(result.message);
        }

        // Update message state locally
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            proposedEdits:
              msg.proposedEdits?.map((edit) =>
                edit.id === editId
                  ? { ...edit, status: action === "approve" ? "applied" : "rejected" }
                  : edit,
              ) || undefined,
          })),
        );
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to apply changes");
    } finally {
      setApplyingEditId(null);
    }
  };

  return (
    <div className="flex flex-col h-[650px] w-full max-w-3xl border border-white/10 rounded-2xl bg-slate-900/60 shadow-[0_0_60px_-15px_rgba(34,211,238,0.2)] backdrop-blur-xl overflow-hidden transition-all duration-500 ease-in-out">
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(34,211,238,0.5)]">
            <Bot className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-white">CodeFlow Agent</h2>
            <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              Neural engine active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isProcessing}>
            <SelectTrigger className="w-[160px] h-8 text-[10px] bg-slate-900/50 border-white/10 text-slate-300 font-mono uppercase tracking-wider focus:ring-cyan-500/20">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
              <SelectItem value="gemini-1.5-flash" className="text-[10px] uppercase font-mono">Gemini 1.5 Flash</SelectItem>
              <SelectItem value="gemini-1.5-pro" className="text-[10px] uppercase font-mono">Gemini 1.5 Pro</SelectItem>
              <SelectItem value="gemini-2.0-flash" className="text-[10px] uppercase font-mono">Gemini 2.0 Flash</SelectItem>
              <SelectItem value="gemini-2.0-pro-exp-02-05" className="text-[10px] uppercase font-mono">Gemini 2.0 Pro Exp</SelectItem>
              <SelectItem value="gemini-2.0-flash-thinking-exp" className="text-[10px] uppercase font-mono">Gemini 2.0 Thinking</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-4 group",
                msg.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_-2px_rgba(34,211,238,0.4)]",
                  msg.role === "user" 
                    ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950" 
                    : "bg-slate-800 border border-white/10 text-cyan-400",
                )}
              >
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={cn(
                  "space-y-3 max-w-[80%]",
                  msg.role === "user" ? "items-end" : "items-start",
                )}
              >
                {msg.thought && (
                  <Card className="p-3 text-[11px] bg-slate-900/40 text-slate-400 border-dashed border-cyan-500/20 leading-relaxed font-mono">
                    <div className="flex items-center gap-1.5 mb-2 font-bold uppercase tracking-[0.15em] text-[9px] text-cyan-400/70">
                      <ChevronRight className="w-3 h-3" />
                      Neural Reasoning
                    </div>
                    {msg.thought}
                  </Card>
                )}

                <Card
                  className={cn(
                    "p-4 text-sm leading-relaxed shadow-sm transition-all duration-300",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-cyan-500/90 to-blue-600/90 border-0 text-white rounded-tr-none"
                      : "bg-slate-800/80 border-white/10 text-slate-100 rounded-tl-none backdrop-blur-sm",
                  )}
                >
                  {msg.content}
                </Card>

                {msg.proposedEdits && msg.proposedEdits.length > 0 && (
                  <div className="space-y-3 mt-2 w-full">
                    {msg.proposedEdits.map((edit, j) => (
                      <Card key={j} className="overflow-hidden border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_30px_-10px_rgba(34,211,238,0.1)]">
                        <div className="p-3 border-b border-cyan-500/10 bg-cyan-500/10 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5" />
                            {edit.file_path}
                          </div>
                          <Badge
                            variant={edit.status === "applied" ? "default" : "outline"}
                            className="text-[9px] uppercase tracking-tighter"
                          >
                            {edit.status === "applied"
                              ? "Applied"
                              : edit.status === "rejected"
                                ? "Rejected"
                                : "Proposed Change"}
                          </Badge>
                        </div>
                        <div className="p-0 relative">
                          <pre className="text-[11px] p-4 rounded-none font-mono overflow-x-auto bg-[#0d1117] text-white leading-5">
                            {edit.diff.split("\n").map((line, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "px-4 -mx-4",
                                  line.startsWith("+")
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : line.startsWith("-")
                                      ? "bg-rose-500/20 text-rose-400"
                                      : line.startsWith("@@")
                                        ? "text-sky-400/70"
                                        : "",
                                )}
                              >
                                {line}
                              </div>
                            ))}
                          </pre>
                        </div>
                        {edit.status !== "applied" && edit.status !== "rejected" && (
                          <div className="p-2 bg-slate-900/80 border-t border-white/10 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-[11px] font-bold uppercase tracking-wider bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-all"
                              disabled={applyingEditId !== null}
                              onClick={() => edit.id && onEditAction(edit.id, "approve")}
                            >
                              {applyingEditId === edit.id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                              ) : (
                                <Check className="w-3 h-3 mr-2" />
                              )}
                              Approve & Apply
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-[11px] font-bold uppercase tracking-wider bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 transition-all"
                              disabled={applyingEditId !== null}
                              onClick={() => edit.id && onEditAction(edit.id, "reject")}
                            >
                              <X className="w-3 h-3 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {(edit.status === "applied" || edit.status === "rejected") && (
                          <div className="p-2 bg-slate-900/80 border-t border-white/10 text-center text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                            {edit.status === "applied"
                              ? "Cambios aplicados · Rama actualizada"
                              : "Cambio rechazado"}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-4">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 shadow-sm text-cyan-400 animate-pulse">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-2 max-w-[80%]">
                <Card className="p-4 bg-slate-800/50 rounded-tl-none border-dashed border-white/10 animate-pulse flex items-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-sm text-slate-400 italic font-medium">
                    Explorando código...
                  </span>
                </Card>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-5 border-t border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <form
          className="flex gap-2 relative"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            placeholder="Describe los cambios... (ej. 'Agrega validación de email')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="bg-slate-900/50 text-slate-100 placeholder:text-slate-500 border-white/10 focus:border-cyan-500/50 pr-12 py-6 rounded-2xl focus-visible:ring-cyan-500/20 transition-all"
          />
          <Button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="absolute right-2 top-2 h-8 w-8 rounded-xl p-0 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-cyan-500/20 disabled:opacity-30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest font-medium opacity-60">
          Powered by Gemini ({selectedModel}) • Reads and writes your repo via the GitHub API
        </p>
      </div>
    </div>
  );
}

function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline";
}) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight inline-flex items-center",
        variant === "outline"
          ? "border border-primary/30 text-primary bg-primary/5"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
