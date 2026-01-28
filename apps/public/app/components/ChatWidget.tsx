import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import { Card } from "@diner-saas/ui/card";
import { MessageCircleIcon, XIcon, SendIcon } from "lucide-react";

interface ChatWidgetProps {
  tenantId: string;
}

export function ChatWidget({ tenantId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { tenantId }, // Pass tenantId to the proxy
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
      >
        <MessageCircleIcon className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 flex h-[500px] w-[350px] flex-col shadow-xl">
      <div className="flex items-center justify-between border-b p-4 bg-primary text-primary-foreground rounded-t-lg">
        <h3 className="font-semibold">Ask Us Anything</h3>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-primary/80">
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Hi! I can help with our menu, hours, and more.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-gray-800 border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white text-gray-500 text-xs px-3 py-2 rounded-lg border">Typing...</div>
            </div>
        )}
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Do you have vegan options?"
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
