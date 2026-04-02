"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>{children}</LazyMotion>
      </MotionConfig>
      <Toaster richColors position="top-right" />
    </ClerkProvider>
  );
}
