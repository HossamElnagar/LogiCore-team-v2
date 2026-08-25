import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
  Send,
} from "lucide-react";
import {
  RAG_QUERY_URL,
  RAG_FEEDBACK_URL,
  RAG_HEALTH_URL,
} from "../constants/apiEndpoints";

interface RetrievedDoc {
  content?: string;
  source?: string;
  score?: number;
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  latencyMs?: number;
  insightId?: string;
  sources?: RetrievedDoc[];
  feedback?: 1 | -1 | null;
  expandedSources?: boolean;
}

interface RagResponse {
  answer?: string;
  response?: string;
  result?: string;
  text?: string;
  insightId?: string;
  provenance?: {
    retrievedDocs?: RetrievedDoc[];
  };
  sources?: RetrievedDoc[];
  error?: string;
}

export default function RAGTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // Health check
  // --------------------------------------------------
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(RAG_HEALTH_URL, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`RAG health check failed: ${response.status}`);
        }

        setOnline(true);
      } catch (error) {
        console.error("RAG health check failed:", error);
        setOnline(false);
      }
    };

    void checkHealth();
  }, []);

  // --------------------------------------------------
  // Auto scroll
  // --------------------------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // --------------------------------------------------
  // Send message to RAG
  // --------------------------------------------------
  const sendMessage = async () => {
    const query = input.trim();

    if (!query || loading) {
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const startTime = performance.now();

    try {
      const response = await fetch(RAG_QUERY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      let data: RagResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `RAG request failed with status ${response.status}`
        );
      }

      /*
       * The RAG backend may return the generated response
       * using different property names.
       * We support all known/current possibilities.
       */
      const responseText =
        data.answer ??
        data.response ??
        data.result ??
        data.text ??
        "No response generated.";

      const retrievedSources =
        data.provenance?.retrievedDocs ??
        data.sources ??
        [];

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        text:
          typeof responseText === "string"
            ? responseText
            : JSON.stringify(responseText, null, 2),
        latencyMs,
        insightId: data.insightId,
        sources: Array.isArray(retrievedSources)
          ? retrievedSources
          : [],
        feedback: null,
        expandedSources: false,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);

      console.error("RAG query failed:", error);

      let errorMessage = "Something went wrong. Please try again.";

      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: errorMessage,
          latencyMs,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Feedback
  // --------------------------------------------------
  const submitFeedback = async (
    msgId: string,
    insightId: string | undefined,
    rating: 1 | -1
  ) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === msgId
          ? {
              ...message,
              feedback: rating,
            }
          : message
      )
    );

    if (!insightId) {
      return;
    }

    try {
      const response = await fetch(RAG_FEEDBACK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          insightId,
          rating,
        }),
      });

      if (!response.ok) {
        console.error(
          `Feedback request failed: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Feedback request failed:", error);
    }
  };

  // --------------------------------------------------
  // Toggle sources
  // --------------------------------------------------
  const toggleSources = (msgId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === msgId
          ? {
              ...message,
              expandedSources: !message.expandedSources,
            }
          : message
      )
    );
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4">
        {/* Header */}
        <header className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/80 px-6 py-4 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2ec866]/40 bg-[#2ec866]/20">
              <Bot size={20} className="text-[#2ec866]" />
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-[#2ec866]">
                LogiCore
              </p>

              <h1 className="text-lg font-extrabold leading-tight text-slate-900">
                AI Assistant / RAG Tester
              </h1>
            </div>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              online === null
                ? "border-slate-200 bg-slate-100 text-slate-500"
                : online
                ? "border-[#2ec866]/30 bg-[#2ec866]/15 text-[#1aab52]"
                : "border-rose-200 bg-rose-100 text-rose-600"
            }`}
          >
            {online === null
              ? "Checking..."
              : online
              ? "● Online"
              : "● Offline"}
          </span>
        </header>

        {/* Chat area */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.20)] backdrop-blur">
          {messages.length === 0 && !loading && (
            <div className="flex h-full select-none flex-col items-center justify-center gap-2 text-slate-400">
              <Bot size={40} className="opacity-30" />

              <p className="text-sm font-medium">
                Ask anything about your logistics operations.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`flex max-w-[85%] flex-col gap-1 ${
                    message.role === "user"
                      ? "items-end"
                      : "items-start"
                  }`}
                >
                  {/* Message bubble */}
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-sm bg-[#0f172a] text-white"
                        : "rounded-bl-sm border border-slate-200 bg-slate-100 text-slate-800"
                    }`}
                  >
                    {message.text}
                  </div>

                  {/* AI metadata */}
                  {message.role === "ai" && (
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      {message.latencyMs !== undefined && (
                        <span className="text-[10px] text-slate-400">
                          ⏱ {message.latencyMs}ms
                        </span>
                      )}

                      {/* Sources */}
                      {message.sources &&
                        message.sources.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              toggleSources(message.id)
                            }
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-slate-200"
                          >
                            {message.expandedSources ? (
                              <ChevronUp size={11} />
                            ) : (
                              <ChevronDown size={11} />
                            )}

                            {message.sources.length}{" "}
                            source
                            {message.sources.length !== 1
                              ? "s"
                              : ""}
                          </button>
                        )}

                      {/* Feedback */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            submitFeedback(
                              message.id,
                              message.insightId,
                              1
                            )
                          }
                          disabled={
                            message.feedback !== null &&
                            message.feedback !== undefined
                          }
                          className={`rounded-lg p-1 transition-colors ${
                            message.feedback === 1
                              ? "bg-[#2ec866]/15 text-[#2ec866]"
                              : "text-slate-400 hover:bg-[#2ec866]/10 hover:text-[#2ec866]"
                          } disabled:cursor-default`}
                          title="Helpful"
                        >
                          <ThumbsUp size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            submitFeedback(
                              message.id,
                              message.insightId,
                              -1
                            )
                          }
                          disabled={
                            message.feedback !== null &&
                            message.feedback !== undefined
                          }
                          className={`rounded-lg p-1 transition-colors ${
                            message.feedback === -1
                              ? "bg-rose-100 text-rose-500"
                              : "text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                          } disabled:cursor-default`}
                          title="Not helpful"
                        >
                          <ThumbsDown size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sources accordion */}
                  {message.role === "ai" &&
                    message.expandedSources &&
                    message.sources &&
                    message.sources.length > 0 && (
                      <div className="mt-1 w-full space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Retrieved Sources
                        </p>

                        {message.sources.map((doc, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="truncate font-semibold text-slate-900">
                                {doc.source ??
                                  `Document ${index + 1}`}
                              </span>

                              {doc.score !== undefined && (
                                <span className="shrink-0 rounded-full bg-[#2ec866]/15 px-2 py-0.5 text-[10px] font-bold text-[#1aab52]">
                                  {(doc.score * 100).toFixed(
                                    0
                                  )}
                                  % match
                                </span>
                              )}
                            </div>

                            {doc.content && (
                              <p className="line-clamp-3 text-slate-500">
                                {doc.content}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-100 px-4 py-3">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                        style={{
                          animationDelay: `${index * 150}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.20)] backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask about shipments, incidents, fleet status..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#2ec866] focus:ring-2 focus:ring-[#2ec866]/20"
              style={{
                maxHeight: 120,
                overflowY: "auto",
              }}
            />

            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f172a] text-white transition-all hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-40"
              title="Send (Enter)"
            >
              <Send size={16} />
            </button>
          </div>

          <p className="mt-1.5 px-1 text-[10px] text-slate-400">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}