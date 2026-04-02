"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { SubscriptionPlan, SubscriptionUsage } from "@/types/database";

type SubscriptionContextValue = {
  usage: SubscriptionUsage | null;
  plan: SubscriptionPlan | null;
  loading: boolean;
  refresh: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  usage: null,
  plan: null,
  loading: true,
  refresh: () => {},
});

async function fetchBillingUsage(): Promise<{
  usage: SubscriptionUsage | null;
  plan: SubscriptionPlan | null;
}> {
  const res = await fetch("/api/billing/usage");
  if (!res.ok) throw new Error("Failed to fetch usage");
  const data = await res.json();
  return {
    usage: data.usage ?? null,
    plan: data.plan ?? null,
  };
}

export function SubscriptionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchBillingUsage()
      .then((data) => {
        setUsage(data.usage);
        setPlan(data.plan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBillingUsage()
      .then((data) => {
        if (!cancelled) {
          setUsage(data.usage);
          setPlan(data.plan);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{ usage, plan, loading, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
