import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Code, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServerFn } from '@tanstack/react-start';
import { processAgentMessage } from '@/lib/agent/gemini.functions';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  proposedEdits?: Array<{ file_path: string; diff: string }>;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const processMessage = useServerFn(processAgentMessage);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
          conversationId: 'mock-conv-id', // Would be real in a full implementation
          message: input,
          repositoryId,
        }
      });

      if (response.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.content,
          thought: response.thought,
          proposedEdits: response.proposedEdits,
        }]);
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

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl border rounded-lg bg-background overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
        <Bot className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">CodeFlow Agent</h2>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className="space-y-2">
                {msg.thought && (
                  <Card className="p-2 text-xs bg-muted/50 text-muted-foreground border-dashed">
                    <div className="flex items-center gap-1 mb-1">
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-medium">Thinking</span>
                    </div>
                    {msg.thought}
                  </Card>
                )}
                
                <Card className={cn(
                  "p-3 text-sm",
                  msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card"
                )}>
                  {msg.content}
                </Card>

                {msg.proposedEdits && msg.proposedEdits.length > 0 && (
                  <div className="space-y-2">
                    {msg.proposedEdits.map((edit, j) => (
                      <Card key={j} className="p-3 border-primary/50 bg-primary/5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <FileText className="w-3 h-3" />
                            {edit.file_path}
                          </div>
                          <Badge variant="outline" className="text-[10px]">PROPOSED CHANGE</Badge>
                        </div>
                        <pre className="text-[10px] bg-background p-2 rounded border overflow-x-auto font-mono">
                          {edit.diff}
                        </pre>
                        <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs">
                          Review Changes
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-3 mr-auto">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <Card className="p-3 bg-card flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <form 
          className="flex gap-2" 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            placeholder="Describe the changes you want..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="bg-background"
          />
          <Button type="submit" disabled={isProcessing || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-xs font-semibold",
      variant === "outline" ? "border text-foreground" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
}
