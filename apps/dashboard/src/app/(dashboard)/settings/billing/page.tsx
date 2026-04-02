import { redirect } from "next/navigation";
import { SectionReveal } from "@/components/ui/section-reveal";
import { getCurrentUserRole } from "@/lib/queries/settings";
import { BillingClient } from "./billing-client";

export default async function BillingSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/settings/data-model");
  }

  return (
    <div className="space-y-8">
      <SectionReveal>
        <BillingClient />
      </SectionReveal>
    </div>
  );
}
