import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  User,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiConversationsQueryKey,
  getListOpenaiMessagesQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import type { OpenaiConversation, OpenaiMessage } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";

// 🔥 API URL centralizado (con fallback)
const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://asset-manager-fomv.onrender.com";

// ================== OPTIMIZE ==================
function OptimizePanel() {
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState("");
  const [done, setDone] = useState(false);

  const handleOptimize = async () => {
    setStreaming(true);
    setResult("");
    setDone(false);

    try {
      const res = await fetch(`${API_URL}/api/openai/optimize-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        toast.error("Failed to start optimization");
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                setDone(true);
              } else if (data.content) {
                setResult((prev) => prev + data.content);
              }
            } catch {}
          }
        }
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Optimize My Day</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            AI analyzes your tasks and recommends the optimal order.
          </p>
        </div>
        <button
          onClick={handleOptimize}
          disabled={streaming}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
        >
          <Sparkles className="w-4 h-4" />
          {streaming ? "Analyzing..." : "Optimize"}
        </button>
      </div>

      {result && (
        <div className="bg-background border rounded-lg p-4">
          <p className="text-sm whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

// ================== MESSAGE ==================
function ChatMessage({ msg }: { msg: OpenaiMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted">
        {isUser ? <User className="w-4" /> : <Bot className="w-4" />}
      </div>
      <div className="bg-secondary rounded-xl px-4 py-2 text-sm">
        {msg.content}
      </div>
    </div>
  );
}

// ================== CHAT ==================
function ChatPane({ conversation }: { conversation: OpenaiConversation }) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const qc = useQueryClient();

  const { data: messages = [] } = useListOpenaiMessages(conversation.id);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const content = input.trim();
    setInput("");
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch(
        `${API_URL}/api/openai/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (!res.ok) {
        toast.error("Failed to send message");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setStreamText("");
              qc.invalidateQueries({
                queryKey: getListOpenaiMessagesQueryKey(conversation.id),
              });
            } else if (data.content) {
              full += data.content;
              setStreamText(full);
            }
          }
        }
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}
        {streamText && <div>{streamText}</div>}
      </div>

      <div className="flex gap-2 mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2"
        />
        <button onClick={handleSend}>
          <Send />
        </button>
      </div>
    </div>
  );
}

// ================== MAIN ==================
export default function AIPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: conversations = [] } = useListOpenaiConversations();

  const selectedConversation = conversations.find(
    (c) => c.id === selectedId
  );

  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-3">
        <OptimizePanel />
        {conversations.map((c) => (
          <div key={c.id} onClick={() => setSelectedId(c.id)}>
            {c.title}
          </div>
        ))}
      </div>

      <div className="flex-1">
        {selectedConversation && (
          <ChatPane conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">
                  AI Assistant
                </h3>
                <p className="text-sm max-w-xs">
                  Select a conversation or start a new one to chat with your AI
                  productivity assistant.
                </p>
              </div>
              <button
                onClick={() =>
                  createConversation({
                    data: {
                      title: `Chat ${new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`,
                    },
                  })
                }
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
              <div className="flex items-center gap-2 text-xs border border-border rounded-lg px-4 py-2.5">
                <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                Or use <strong className="text-foreground">Optimize My Day</strong> in the left panel for instant AI analysis
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
