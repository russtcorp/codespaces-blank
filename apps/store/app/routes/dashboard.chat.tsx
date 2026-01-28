import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { Card } from "@diner-saas/ui/card";
import { Input } from "@diner-saas/ui/input";
import { Button } from "@diner-saas/ui/button";
import { useEffect, useRef, useState } from "react";
import { SendIcon, MicIcon, SquareIcon } from "lucide-react";
import { useChat } from "ai/react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  let initialMessages = [];
  try {
    const res = await env.AGENT_DO.fetch(`https://agent.internal/history?tenantId=${user.tenantId}`);
    if (res.ok) {
        const history = await res.json();
        initialMessages = history.map((m: any) => ({
            id: m.id,
            role: m.from === 'agent' ? 'assistant' : 'user',
            content: m.body,
            createdAt: new Date(m.timestamp)
        }));
    }
  } catch (e) {}

  return json({ user, initialMessages });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const env = (context as any).cloudflare?.env;
    const authenticator = getAuthenticator(env);
    const user = await authenticator.isAuthenticated(request);
    
    if (!user) throw new Response("Unauthorized", { status: 401 });

    const body = await request.json();
    
    // Proxy to Agent Worker
    const response = await env.AGENT_DO.fetch(`https://agent.internal/stream-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...body,
            tenantId: user.tenantId
        })
    });

    return response;
}

export default function DashboardChat() {
  const { user, initialMessages } = useLoaderData<typeof loader>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    initialMessages,
    api: "/dashboard/chat",
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await handleTranscribe(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
        const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        if (data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
        }
    } catch (e) {
        console.error("Transcription failed", e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Manager</h1>
            <p className="mt-1 text-gray-600">
            Chat with your diner assistant.
            </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        {/* Chat History */}
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
            {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-400">
                    <p>No messages yet. Say hello!</p>
                </div>
            ) : (
                messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? "justify-end" : "justify-start"}`}>
                        <div 
                            className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
                                m.role === 'user'
                                    ? "bg-blue-600 text-white" 
                                    : "bg-white text-gray-800 border border-gray-200"
                            }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        </div>
                    </div>
                ))
            )}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white text-gray-500 text-xs px-4 py-2 rounded-lg border">Typing...</div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Button 
                    type="button" 
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                >
                    {isRecording ? <SquareIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
                </Button>
                <Input 
                    placeholder="Type a message..." 
                    value={input}
                    onChange={handleInputChange}
                    autoFocus
                />
                <Button type="submit" disabled={isLoading || isRecording}>
                    <SendIcon className="h-4 w-4" />
                </Button>
            </form>
        </div>
      </Card>
    </div>
  );
}
