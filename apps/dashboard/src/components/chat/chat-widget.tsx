"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ChatPanel } from "./chat-panel";

const MIN_WIDTH = 340;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 420;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, resetSession } = useChat();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Horizontal resize via pointer events
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const newWidth = window.innerWidth - e.clientX;
    setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <>
      {/* Floating chat button — hidden when drawer is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Open chat assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Side drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 z-50 h-full max-w-full border-l bg-background shadow-xl transition-transform duration-300 ease-in-out"
        style={{
          width: `min(${width}px, 100vw)`,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Resize handle (left edge) */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30"
        />

        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Chat panel */}
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSend={sendMessage}
          onReset={resetSession}
          onNavigate={() => setOpen(false)}
        />
      </div>
    </>
  );
}
