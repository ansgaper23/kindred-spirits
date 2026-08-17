import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Code, ChevronRight, FileText, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServerFn } from '@tanstack/react-start';
import { processAgentMessage } from '@/lib/agent/gemini.functions';
import { approveAndApplyEdit } from '@/lib/agent/edits.functions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProposedEdit {
  id?: string;
  file_path: string;
  diff: string;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string | undefined;
  proposedEdits?: ProposedEdit[] | undefined;
}

export function ChatInterface({ repositoryId }: { repositoryId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your CodeFlow agent. How can I help you with your code today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyingEditId, setApplyingEditId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const processMessage = useServerFn(processAgentMessage);
  const handleEditAction = useServerFn(approveAndApplyEdit);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await processMessage({
        data: {
          conversationId: '00000000-0000-0000-0000-000000000000', // Mock UUID
          message: input,
          repositoryId,
        }
      });

      if (response.success) {
        const newMessage: Message = {
          role: 'assistant',
          content: response.content,
          thought: response.thought || undefined,
          proposedEdits: response.proposedEdits ? response.proposedEdits.map((e: any) => ({ 
            ...e, 
            id: crypto.randomUUID(),
            status: 'pending'
          })) : undefined,
        };
        setMessages(prev => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Sorry, I encountered an error while processing your request.',
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const onApprove = async (editId: string) => {
    setApplyingEditId(editId);
    try {
      const result = await handleEditAction({
        data: { editId, action: 'approve' }
      });
      if (result.success) {
        toast.success(result.message, {
          action: result.prUrl ? {
            label: 'View PR',
            onClick: () => window.open(result.prUrl!, '_blank')
          } : undefined
        });
        
        // Update message state locally
        setMessages(prev => prev.map(msg => ({
          ...msg,
          proposedEdits: msg.proposedEdits?.map(edit => 
            edit.id === editId ? { ...edit, status: 'applied' } : edit
          ) || undefined
        })));
      }
    } catch (error) {
      toast.error("Failed to apply changes");
    } finally {
      setApplyingEditId(null);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-3xl border rounded-xl bg-background shadow-lg overflow-hidden transition-all duration-300 ease-in-out">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm leading-none">CodeFlow Agent</h2>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready to help
            </span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-4 group",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card border"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={cn(
                "space-y-3 max-w-[80%]",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                {msg.thought && (
                  <Card className="p-3 text-xs bg-muted/40 text-muted-foreground border-dashed border-muted-foreground/20 leading-relaxed">
                    <div className="flex items-center gap-1.5 mb-1.5 font-semibold uppercase tracking-wider opacity-70">
                      <ChevronRight className="w-3 h-3" />
                      Reasoning
                    </div>
                    {msg.thought}
                  </Card>
                )}
                
                <Card className={cn(
                  "p-4 text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card rounded-tl-none"
                )}>
                  {msg.content}
                </Card>

                {msg.proposedEdits && msg.proposedEdits.length > 0 && (
                  <div className="space-y-3 mt-2 w-full">
                    {msg.proposedEdits.map((edit, j) => (
                      <Card key={j} className="overflow-hidden border-primary/20 bg-primary/5">
                        <div className="p-3 border-b border-primary/10 bg-primary/10 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <FileText className="w-3.5 h-3.5" />
                            {edit.file_path}
                          </div>
                          <Badge variant={edit.status === 'applied' ? 'default' : 'outline'} className="text-[9px] uppercase tracking-tighter">
                            {edit.status === 'applied' ? 'Applied' : 'Proposed Change'}
                          </Badge>
                        </div>
                        <div className="p-0 relative">
                          <pre className="text-[11px] p-4 rounded-none font-mono overflow-x-auto bg-[#0d1117] text-white leading-5">
                            {edit.diff.split('\n').map((line, idx) => (
                              <div key={idx} className={cn(
                                "px-4 -mx-4",
                                line.startsWith('+') ? "bg-emerald-500/20 text-emerald-400" :
                                line.startsWith('-') ? "bg-rose-500/20 text-rose-400" :
                                line.startsWith('@@') ? "text-sky-400/70" : ""
                              )}>
                                {line}
                              </div>
                            ))}
                          </pre>
                        </div>
                        {edit.status !== 'applied' && (
                          <div className="p-2 bg-muted/50 border-t flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1 h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={applyingEditId !== null}
                              onClick={() => edit.id && onApprove(edit.id)}
                            >
                              {applyingEditId === edit.id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Check className="w-3 h-3 mr-1" />
                              )}
                              Approve & Apply
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-8 text-xs font-medium"
                              disabled={applyingEditId !== null}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {edit.status === 'applied' && (
                          <div className="p-2 bg-muted/50 border-t text-center">
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground w-full">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View on GitHub
                            </Button>
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
              <div className="w-9 h-9 rounded-full bg-card border flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-2 max-w-[80%]">
                 <Card className="p-4 bg-card rounded-tl-none border-dashed animate-pulse flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-sm text-muted-foreground italic">Agent is exploring your code...</span>
                </Card>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/20 backdrop-blur-sm">
        <form 
          className="flex gap-2 relative" 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            placeholder="Describe the changes you want (e.g. 'Add email validation to the login form')" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="bg-background pr-12 py-6 rounded-xl border-2 focus-visible:ring-primary transition-all"
          />
          <Button 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg p-0 shadow-md"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest font-medium opacity-60">
          Powered by Gemini 2.5 Pro • Sandboxed in E2B
        </p>
      </div>
    </div>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight inline-flex items-center",
      variant === "outline" ? "border border-primary/30 text-primary bg-primary/5" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
}
