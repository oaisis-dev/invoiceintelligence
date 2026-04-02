"use client";

import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/hooks/use-chat";
import { Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessage;
  onNavigate?: () => void;
}

export function ChatMessageBubble({ message, onNavigate }: ChatMessageProps) {
  const router = useRouter();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--primary)] px-4 py-2.5 text-white">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--bg-card)] px-4 py-2.5 shadow-sm">
        {message.streaming && !message.content && message.toolCalls?.length ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              {message.toolCalls[message.toolCalls.length - 1]
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
              ...
            </span>
          </div>
        ) : message.streaming && !message.content ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Thinking...</span>
          </div>
        ) : message.error ? (
          <p className="text-sm text-[var(--error)]">{message.content}</p>
        ) : (
          <div className="prose-chat text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith("/")) {
                    return (
                      <button
                        className="text-[var(--primary)] underline hover:opacity-80"
                        onClick={() => {
                          router.push(href);
                          onNavigate?.();
                        }}
                      >
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] underline hover:opacity-80"
                    >
                      {children}
                    </a>
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block overflow-x-auto rounded bg-[var(--bg-page)] p-2 font-mono text-xs">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="rounded bg-[var(--bg-page)] px-1 py-0.5 font-mono text-xs">
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="min-w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-b border-[var(--border-table)] px-2 py-1 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-[var(--border-table)] px-2 py-1">{children}</td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
