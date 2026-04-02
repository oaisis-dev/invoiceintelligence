import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/queries/settings";
import { MembersClient } from "./members-client";

export default async function MembersSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/settings/data-model");
  }

  return <MembersClient />;
}
