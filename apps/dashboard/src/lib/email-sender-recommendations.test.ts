import { describe, expect, it, vi } from "vitest";
import { approveSenderRecommendations } from "./email-sender-recommendations";

describe("approveSenderRecommendations", () => {
  it("skips location-overridden recommendations during org approval", async () => {
    const recommendationsTable = {
      select: vi.fn(() => ({
        eq: vi
          .fn()
          .mockReturnThis()
          .mockReturnValueOnce({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: "rec-1", location_id: "loc-1" },
                { id: "rec-2", location_id: "loc-2" },
              ],
              error: null,
            }),
          }),
      })),
      update: vi.fn(() => ({
        in: vi.fn(async () => ({ error: null })),
      })),
    };
    const allowedSendersTable = {
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ location_id: "loc-1" }],
          error: null,
        })),
      })),
    };

    const result = await approveSenderRecommendations({
      supabase: {
        from: vi.fn((table: string) => {
          if (table === "email_sender_recommendations") return recommendationsTable;
          if (table === "email_allowed_senders") return allowedSendersTable;
          throw new Error(`Unexpected table ${table}`);
        }),
      },
      orgId: "org-1",
      senderEmail: "ap@vendor.com",
      scope: "org",
      locationId: "loc-1",
    });

    expect(result).toEqual({
      approvedIds: ["rec-2"],
      blockedByOverride: true,
    });
  });
});
