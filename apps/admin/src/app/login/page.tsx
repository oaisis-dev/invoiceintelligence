"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: response.credential }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Authentication failed");
        }

        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 300,
        text: "signin_with",
      });
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [handleGoogleCallback]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Platform Admin
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sign in to access the administration dashboard
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div ref={buttonRef} />
          {loading && (
            <p className="text-sm text-[var(--text-secondary)]">Signing in...</p>
          )}
          {error && (
            <p className="text-sm text-[var(--error)]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
