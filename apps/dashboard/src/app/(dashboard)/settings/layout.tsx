import { SettingsNav } from "./settings-nav";
import { getCurrentUserRole } from "@/lib/queries/settings";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = (await getCurrentUserRole()) ?? "staff";

  return (
    <div className="flex gap-8 p-8">
      <aside className="w-[220px] shrink-0">
        <SettingsNav role={role} />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
