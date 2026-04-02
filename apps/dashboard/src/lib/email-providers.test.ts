import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyMailboxAccess } from "@/lib/email-providers";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("verifyMailboxAccess", () => {
  it("attempts an idempotent Gmail modify probe when an inbox message exists", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emailAddress: "billing@example.com" }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: "msg-1" }] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ labelIds: ["INBOX"] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg-1", labelIds: ["INBOX"] }),
      } as never);

    const result = await verifyMailboxAccess("google", "token");

    expect(result.status).toBe("verified");
    expect(vi.mocked(fetch).mock.calls[3]?.[0]).toContain("/modify");
    expect(vi.mocked(fetch).mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("fails verification when the Gmail inbox is empty", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emailAddress: "billing@example.com" }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      } as never);

    const result = await verifyMailboxAccess("google", "token");

    expect(result.status).toBe("failed");
    expect(result.message).toContain("Inbox is empty");
  });

  it("attempts an idempotent Microsoft message patch when an inbox message exists", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: "msg-1", isRead: true }] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "msg-1", isRead: true }),
      } as never);

    const result = await verifyMailboxAccess("microsoft", "token");

    expect(result.status).toBe("verified");
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toContain("/me/messages/msg-1");
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });

  it("fails verification when the Microsoft inbox is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    } as never);

    const result = await verifyMailboxAccess("microsoft", "token");

    expect(result.status).toBe("failed");
    expect(result.message).toContain("Inbox is empty");
  });
});
