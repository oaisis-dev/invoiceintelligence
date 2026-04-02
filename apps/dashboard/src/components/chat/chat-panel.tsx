"use client";

import { useRef, useEffect, useState } from "react";
import { Send, RotateCcw, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-chat";
import { ChatMessageBubble } from "./chat-message";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (content: string) => void;
  onReset: () => void;
  onNavigate?: () => void;
}

export function ChatPanel({ messages, isLoading, onSend, onReset, onNavigate }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--bg-card-border)] py-3 pl-4 pr-12">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Invoice Assistant
          </h2>
        </div>
        <button
          onClick={onReset}
          className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-page)] hover:text-[var(--text-primary)]"
          title="New conversation"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 pt-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-page)]">
              <MessageSquare className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Invoice Assistant
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Ask about invoices, line items, vendors, duplicates, and more.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} onNavigate={onNavigate} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--bg-card-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about invoices..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
