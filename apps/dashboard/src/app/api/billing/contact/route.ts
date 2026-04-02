import { type NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; message?: string; orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: { code: "MISSING_FIELDS", message: "name and email are required" } },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("contact_requests").insert({
    org_id: body.orgId ?? null,
    name: body.name,
    email: body.email,
    message: body.message ?? null,
  });

  if (error) {
    console.error("[billing/contact] Failed to store request:", error);
    return NextResponse.json(
      { error: { code: "STORE_FAILED", message: "Failed to store contact request" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
