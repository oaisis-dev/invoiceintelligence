import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/authz";

const CHAT_AGENT_URL = process.env.CHAT_AGENT_URL ?? "";

/**
 * POST /api/chat
 *
 * Authenticates via Clerk, injects org_id from Supabase user record,
 * and proxies the SSE stream from the chat agent back to the browser.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  if (!CHAT_AGENT_URL) {
    return NextResponse.json(
      { error: { code: "CHAT_NOT_CONFIGURED", message: "Chat agent not configured" } },
      { status: 503 }
    );
  }

  let body: { message?: string; session_id?: string; current_page?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.message?.trim()) {
    return NextResponse.json(
      { error: { code: "MISSING_MESSAGE", message: "Message is required" } },
      { status: 400 }
    );
  }

  const systemContext = body.current_page
    ? `User is currently viewing: ${body.current_page}`
    : "";

  // Get GCP ID token for Cloud Run service-to-service auth
  const idToken = await getIdToken(CHAT_AGENT_URL);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  let agentRes: Response;
  try {
    agentRes = await fetch(`${CHAT_AGENT_URL}/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: body.message,
        org_id: context.orgId,
        session_id: body.session_id ?? "",
        system_context: systemContext,
      }),
    });
  } catch (err) {
    console.error("Chat agent request failed:", err);
    return NextResponse.json(
      { error: { code: "AGENT_UNREACHABLE", message: "Chat agent is unreachable" } },
      { status: 502 }
    );
  }

  if (!agentRes.ok || !agentRes.body) {
    const text = await agentRes.text().catch(() => "");
    console.error(`Chat agent returned ${agentRes.status}: ${text}`);
    return NextResponse.json(
      { error: { code: "AGENT_ERROR", message: "Chat agent error" } },
      { status: agentRes.status }
    );
  }

  // Pipe the SSE stream through to the browser
  return new Response(agentRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function getIdToken(targetUrl: string): Promise<string | null> {
  // Only fetch ID token when running on Cloud Run (K_SERVICE is set)
  if (!process.env.K_SERVICE) return null;
  try {
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${targetUrl}`;
    const res = await fetch(metadataUrl, {
      headers: { "Metadata-Flavor": "Google" },
    });
    return await res.text();
  } catch {
    return null;
  }
}
