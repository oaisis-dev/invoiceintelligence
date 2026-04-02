"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";

export function SearchInput({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams, value]
  );

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-input)] bg-[var(--bg-input)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      />
    </form>
  );
}
