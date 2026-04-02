"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/system-config" },
  { label: "Fields", href: "/system-config/fields" },
  { label: "Mappings", href: "/system-config/mappings" },
  { label: "Categories", href: "/system-config/categories" },
  { label: "Settings", href: "/system-config/settings" },
  { label: "Value Types", href: "/system-config/value-types" },
  { label: "Format Options", href: "/system-config/format-options" },
  { label: "Recommendations", href: "/system-config/recommendations" },
];

export default function SystemConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/system-config") return pathname === "/system-config";
    return pathname.startsWith(href);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          System Config
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage system-level normalization templates, mappings, and recommendations.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border-glass)]">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive(tab.href)
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-glass)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
