import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const { id_token } = await request.json();
    if (!id_token || typeof id_token !== "string") {
      return NextResponse.json(
        { error: "id_token is required" },
        { status: 400 }
      );
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json(
        { error: "Invalid token: no email" },
        { status: 401 }
      );
    }

    const email = payload.email.toLowerCase();

    // Check platform_admins table
    const supabase = createAdminClient();
    const { data: admin, error } = await supabase
      .from("platform_admins")
      .select("id, email, display_name, permissions, is_active")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!admin || !admin.is_active) {
      return NextResponse.json(
        { error: "Not authorized as a platform admin" },
        { status: 403 }
      );
    }

    // Create JWT session token
    const token = await createSessionToken(admin.email, admin.permissions);

    const response = NextResponse.json({
      ok: true,
      email: admin.email,
      displayName: admin.display_name,
      permissions: admin.permissions,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
