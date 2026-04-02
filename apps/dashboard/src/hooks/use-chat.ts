"use client";

import { useState, useCallback, useRef } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
  streaming?: boolean;
  toolCalls?: string[];
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef(crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);

  const resetSession = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Create placeholder assistant message
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          session_id: sessionIdRef.current,
          current_page: window.location.pathname + window.location.search,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: { message: "Request failed" } }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errData.error?.message ?? "Request failed", error: true, streaming: false }
              : m
          )
        );
        setIsLoading(false);
        return;
      }

      if (!res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "No response from agent", error: true, streaming: false }
              : m
          )
        );
        setIsLoading(false);
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let data: { type: string; text?: string; partial?: boolean; tool?: string; session_id?: string; message?: string };
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (data.type === "tool_call" && data.tool) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls ?? []), data.tool!] }
                  : m
              )
            );
          } else if (data.type === "token" && data.text != null) {
            // ADK sends cumulative text on each event (partial or final)
            fullText = data.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: fullText, toolCalls: undefined }
                  : m
              )
            );
          } else if (data.type === "done") {
            if (data.session_id) {
              sessionIdRef.current = data.session_id;
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, streaming: false } : m
              )
            );
          } else if (data.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: data.message ?? "An error occurred", error: true, streaming: false }
                  : m
              )
            );
          }
        }
      }

      // Ensure streaming is marked complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.streaming ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Failed to connect to chat agent", error: true, streaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading]);

  return { messages, isLoading, sendMessage, resetSession };
}
