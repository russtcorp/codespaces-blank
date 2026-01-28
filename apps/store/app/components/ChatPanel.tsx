'use client';

import { useChat } from '@ai-sdk/react';
import { Card } from '@diner-saas/ui/card';
import { Input } from '@diner-saas/ui/input';
import { Button } from '@diner-saas/ui/button';
import { Bot, User, Send } from 'lucide-react';
import { useRef, useEffect } from 'react';

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="flex flex-col h-full w-full max-w-sm">
      <div className="bg-gray-100 p-4 border-b">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Diner Copilot
        </h3>
        <p className="text-sm text-gray-600">Your AI assistant for managing the store.</p>
      </div>

      <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Bot className="h-6 w-6 text-gray-500 flex-shrink-0" />}
            <div
              className={`p-3 rounded-lg max-w-xs ${
                m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
             {m.role === 'user' && <User className="h-6 w-6 text-gray-500 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50 flex items-center gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="e.g., '86 the soup'"
          className="flex-grow"
        />
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
