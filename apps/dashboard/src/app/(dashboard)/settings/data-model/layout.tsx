"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SectionReveal } from "@/components/ui/section-reveal";

const TABS = [
  { label: "Fields", href: "/settings/data-model/fields" },
  { label: "Categories", href: "/settings/data-model/categories" },
  { label: "Mappings", href: "/settings/data-model/mappings" },
  { label: "Suggestions", href: "/settings/data-model/suggestions" },
  { label: "Settings", href: "/settings/data-model/normalization-settings" },
];

export default function DataModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <SectionReveal>
        <nav className="flex gap-1 border-b border-[var(--border)]">
          {TABS.map(({ label, href }) => {
            const isActive =
              pathname === href || (pathname === "/settings/data-model" && href.endsWith("/fields"));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
                  isActive
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </SectionReveal>

      <SectionReveal delay={0.03}>{children}</SectionReveal>
    </div>
  );
}
