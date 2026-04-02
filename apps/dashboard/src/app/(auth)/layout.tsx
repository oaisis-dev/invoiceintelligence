"use client";

import { EnvironmentBadge } from "@/components/beta-badge";
import { LogoLockup } from "@/components/logo";
import { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = "Invoice Intelligence";
  }, []);

  return (
    <main
      id="main-content"
      data-testid="auth-layout"
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[var(--bg-page)]"
    >
      {/* Top-left atmosphere circle */}
      <div
        data-testid="atmosphere-top-left"
        aria-hidden="true"
        className="absolute left-[51px] top-[51px] size-[345px] rounded-full bg-[var(--primary-05)] opacity-49 blur-[64px]"
      />
      {/* Bottom-right atmosphere circle */}
      <div
        data-testid="atmosphere-bottom-right"
        aria-hidden="true"
        className="absolute bottom-[56px] right-[56px] size-[432px] rounded-full bg-[var(--primary-05)] opacity-46 blur-[64px]"
      />
      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* App Logo/Branding */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
          <LogoLockup className="h-12 w-auto max-w-full" />
          <EnvironmentBadge className="sm:mb-1" />
        </div>

        {children}
      </div>
    </main>
  );
}
