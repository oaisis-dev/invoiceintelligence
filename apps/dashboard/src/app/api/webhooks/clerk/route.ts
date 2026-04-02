import { verifyWebhook } from "@clerk/backend/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDisplayName,
  getIdentityColumnFromEnv,
  linkExistingUserIdentity,
} from "@/lib/provisioning";
import { type NextRequest, NextResponse } from "next/server";

function getWebhookSecret(): string | undefined {
  return process.env.CLERK_WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  const secret = getWebhookSecret();
  if (!secret) {
    console.error("Webhook verification failed: no signing secret configured");
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }

  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(request, { signingSecret: secret });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }

  const identityColumn = getIdentityColumnFromEnv();
  const supabase = createAdminClient();

  try {
    switch (evt.type) {
      case "user.created": {
        const { id: clerkUserId, email_addresses, first_name, last_name } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        if (!primaryEmail) {
          console.warn(
            `Clerk user.created: No email found for Clerk user ${clerkUserId}`
          );
          break;
        }

        const displayName = buildDisplayName(
          primaryEmail,
          [first_name, last_name].filter(Boolean).join(" ")
        );

        const linkedUser = await linkExistingUserIdentity(supabase, {
          email: primaryEmail,
          displayName,
          clerkUserId,
          identityColumn,
        });

        if (linkedUser?.error) {
          console.error(
            `Clerk user.created: Error linking user by email ${primaryEmail}:`,
            linkedUser.error
          );
          break;
        }

        if (linkedUser) {
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { org_id: linkedUser.orgId },
          });

          console.log(
            `Clerk user.created: Linked Clerk user ${clerkUserId} to existing user ${linkedUser.userId}`
          );
        } else {
          console.log(
            `Clerk user.created: No existing workspace found for ${primaryEmail}; waiting for onboarding`
          );
        }
        break;
      }

      case "user.updated": {
        const { id: clerkUserId, email_addresses, first_name, last_name } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        const displayName = [first_name, last_name]
          .filter(Boolean)
          .join(" ") || undefined;

        const updateFields: Record<string, string | undefined> = {};
        if (primaryEmail) updateFields.email = primaryEmail;
        if (displayName) updateFields.display_name = displayName;

        if (Object.keys(updateFields).length === 0) break;

        const { error: updateError } = await supabase
          .from("users")
          .update(updateFields)
          .eq(identityColumn, clerkUserId);

        if (updateError) {
          console.error(
            `Clerk user.updated: Error updating user with ${identityColumn} ${clerkUserId}:`,
            updateError
          );
        } else {
          console.log(
            `Clerk user.updated: Updated user with ${identityColumn} ${clerkUserId}`
          );
        }
        break;
      }

      case "user.deleted": {
        const { id: clerkUserId } = evt.data;
        const { error: updateError } = await supabase
          .from("users")
          .update({ is_active: false })
          .eq(identityColumn, clerkUserId);

        if (updateError) {
          console.error(
            `Clerk user.deleted: Error deactivating user with ${identityColumn} ${clerkUserId}:`,
            updateError
          );
        } else {
          console.log(
            `Clerk user.deleted: Deactivated user with ${identityColumn} ${clerkUserId}`
          );
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        console.log(`Clerk webhook: Unhandled event type ${evt.type}`);
    }
  } catch (err) {
    // Log but return 200 to prevent Clerk from retrying
    console.error("Clerk webhook: Unexpected error processing event:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
