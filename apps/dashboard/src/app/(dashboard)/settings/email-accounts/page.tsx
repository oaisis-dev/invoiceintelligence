import { redirect } from "next/navigation";
import { SectionReveal } from "@/components/ui/section-reveal";
import { getCurrentUserRole } from "@/lib/queries/settings";
import { EmailAccountsClient } from "./email-accounts-client";

export default async function EmailAccountsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "manager") {
    redirect("/invoices");
  }

  return (
    <div className="space-y-8">
      <SectionReveal>
        <EmailAccountsClient role={role} />
      </SectionReveal>
    </div>
  );
}
