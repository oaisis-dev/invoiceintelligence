"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your invoice processing pipeline" },
  "/invoices": { title: "Invoices", subtitle: "View and manage all invoices across your organization" },
  "/upload": { title: "Upload Invoices", subtitle: "Upload PDF invoices for AI-powered processing and extraction" },
  "/email-inbox": { title: "Email Inbox", subtitle: "Emails received by the automated intake system" },
  "/notifications": { title: "Notifications", subtitle: "View all notifications" },
  "/settings": { title: "Settings", subtitle: "Configure your invoice processing preferences" },
  "/settings/billing": { title: "Billing", subtitle: "Manage your subscription, view usage, and update payment details" },
  "/settings/email-accounts": { title: "Email Connections", subtitle: "Connect an email inbox to automatically ingest invoice attachments" },
  "/settings/notifications": { title: "Notification Preferences", subtitle: "Choose which notifications you receive and how they are delivered" },
  "/settings/security": { title: "Security", subtitle: "Security and access settings" },
  "/settings/data-model": { title: "Data Model", subtitle: "Configure how invoice fields, categories, and mappings are normalized" },
};

/** Prefix fallbacks for dynamic routes (e.g. /invoices/[id], /settings/data-model/fields) */
const PREFIX_META: { prefix: string; meta: { title: string; subtitle: string } }[] = [
  { prefix: "/settings/data-model", meta: PAGE_META["/settings/data-model"] },
  { prefix: "/invoices/", meta: { title: "Invoice Detail", subtitle: "Review and manage invoice" } },
];

function getPageMeta(pathname: string): { title: string; subtitle: string } {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  for (const { prefix, meta } of PREFIX_META) {
    if (pathname.startsWith(prefix)) return meta;
  }
  return { title: "Dashboard", subtitle: "" };
}

export function DashboardHeader() {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  return <AppHeader title={meta.title} subtitle={meta.subtitle} />;
}
