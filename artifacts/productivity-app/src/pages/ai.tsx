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

function OptimizePanel() {
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState("");
  const [done, setDone] = useState(false);

  const handleOptimize = async () => {
    setStreaming(true);
    setResult("");
    setDone(false);

    try {
      const API_URL = import.meta.env.VITE_API_URL;

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
            } catch {
              // ignore parse errors
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
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Optimize My Day</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            AI analyzes your tasks and recommends the optimal order to tackle them.
          </p>
        </div>
        <button
          onClick={handleOptimize}
          disabled={streaming}
          className="shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          data-testid="optimize-btn"
        >
          <Sparkles className="w-4 h-4" />
          {streaming ? "Analyzing..." : "Optimize"}
        </button>
      </div>

      {streaming && !result && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Analyzing your tasks...
        </div>
      )}

      {result && (
        <div className="bg-background/60 border border-border rounded-lg p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {result}
            {streaming && !done && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function ChatMessage({ msg }: { msg: OpenaiMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary/20" : "bg-muted"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {format(parseISO(msg.createdAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}

function ChatPane({
  conversation,
}: {
  conversation: OpenaiConversation;
}) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: messages = [] } = useListOpenaiMessages(conversation.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput("");
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch(
        `/api/openai/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (!res.ok) {
        toast.error("Failed to send message");
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

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
                setStreamText("");
                await qc.invalidateQueries({
                  queryKey: getListOpenaiMessagesQueryKey(conversation.id),
                });
                await qc.invalidateQueries({
                  queryKey: getGetOpenaiConversationQueryKey(conversation.id),
                });
              } else if (data.content) {
                full += data.content;
                setStreamText(full);
              }
            } catch {
              // ignore
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium text-sm truncate">{conversation.title}</h3>
        <p className="text-[11px] text-muted-foreground">
          {format(parseISO(conversation.createdAt), "MMM d")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-sm">Start the conversation</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {streamText && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="max-w-[80%] bg-secondary rounded-xl px-4 py-2.5 text-sm leading-relaxed">
              <p className="whitespace-pre-wrap">
                {streamText}
                <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message the AI assistant..."
            disabled={streaming}
            className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-60"
            data-testid="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="chat-send-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: conversations = [] } = useListOpenaiConversations();

  const { mutate: createConversation } = useCreateOpenaiConversation({
    mutation: {
      onSuccess: (conv) => {
        qc.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setSelectedId(conv.id);
      },
      onError: () => toast.error("Failed to create conversation"),
    },
  });

  const { mutate: deleteConversation } = useDeleteOpenaiConversation({
    mutation: {
      onSuccess: (_, vars) => {
        qc.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (selectedId === vars.id) setSelectedId(null);
        toast.success("Conversation deleted");
      },
      onError: () => toast.error("Failed to delete conversation"),
    },
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your intelligent productivity companion
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex flex-col w-64 border-r border-border shrink-0 overflow-hidden">
          <div className="p-3">
            <OptimizePanel />
          </div>

          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Conversations
            </span>
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
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              data-testid="new-chat-btn"
              aria-label="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground px-2">
                <MessageSquare className="w-6 h-6 opacity-30" />
                <p className="text-xs text-center">No conversations yet. Start one above.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                    selectedId === conv.id
                      ? "bg-secondary"
                      : "hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedId(conv.id)}
                  data-testid="conversation-item"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-xs truncate">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation({ id: conv.id });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
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
