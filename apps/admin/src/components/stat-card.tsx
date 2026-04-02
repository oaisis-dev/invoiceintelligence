import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
}

export function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-10)]">
          <Icon className="h-6 w-6 text-[var(--primary)]" />
        </div>
      </div>
    </div>
  );
}
