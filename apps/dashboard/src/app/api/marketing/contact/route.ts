import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://app.oaisis.ai",
  "https://www.invoiceoasis.com",
  "https://invoiceoasis.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const body = await request.json();
    const { name, businessName, email, message, demoRequested } = body as {
      name?: string;
      businessName?: string;
      email?: string;
      message?: string;
      demoRequested?: boolean;
    };

    // Proxy to backend API (handles persistence + email)
    const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:8001";
    const res = await fetch(`${backendUrl}/api/public/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name ?? "",
        business_name: businessName ?? "",
        email: email ?? "",
        message: message ?? "",
        demo_requested: demoRequested ?? false,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to submit." },
        { status: res.status, headers }
      );
    }

    return NextResponse.json({ ok: true, id: data.id ?? null }, { headers });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500, headers }
    );
  }
}
