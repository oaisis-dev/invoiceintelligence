import { redirect } from "next/navigation";
import {
  getCurrentUserRole,
  getOrgSettingsBundle,
} from "@/lib/queries/settings";
import { SettingsForm } from "./settings-form";
import { SectionReveal } from "@/components/ui/section-reveal";

export default async function GeneralSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/settings/data-model");
  }

  const { organization, locations } = await getOrgSettingsBundle();

  return (
    <div className="space-y-8">
      <SectionReveal>
        <SettingsForm org={organization} locations={locations} />
      </SectionReveal>
    </div>
  );
}
