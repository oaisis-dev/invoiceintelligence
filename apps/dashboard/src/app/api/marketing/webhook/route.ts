import { NextResponse } from "next/server";
import Stripe from "stripe";

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHRIS_CHAT_ID ?? "8431835368";
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_LANDING_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_LANDING_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("Stripe landing webhook env vars not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        let customerName = session.customer_details?.name ?? "Unknown";
        let customerEmail = session.customer_details?.email ?? "Unknown";
        let company = "Unknown";

        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (!("deleted" in customer)) {
            customerName = customer.name ?? customerName;
            customerEmail = customer.email ?? customerEmail;
            company =
              (customer.metadata?.company as string) ?? company;
          }
        }

        // Get subscription amount and count active subscriptions for slot number
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        let amountLabel = "Unknown";
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const unitAmount = sub.items.data[0]?.price?.unit_amount;
          if (unitAmount != null) amountLabel = `$${unitAmount / 100}`;
        }

        const subs = await stripe.subscriptions.list({
          status: "active",
          limit: 100,
        });
        const slotNumber = subs.data.length;

        await sendTelegram(
          `<b>New II Customer</b>\n${customerName} at ${company}\n${customerEmail}\n${amountLabel}/month\nSlot ${slotNumber} filled`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer?.id;
        let customerName = "Unknown";
        let customerEmail = "Unknown";

        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (!("deleted" in customer)) {
            customerName = customer.name ?? "Unknown";
            customerEmail = customer.email ?? "Unknown";
          }
        }

        const mrrLost =
          sub.items.data[0]?.price?.unit_amount != null
            ? `$${(sub.items.data[0].price.unit_amount / 100).toFixed(0)}`
            : "Unknown";

        await sendTelegram(
          `<b>Customer Churned</b>\n${customerName}\n${customerEmail}\nMRR lost: ${mrrLost}/month`
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        let customerName = "Unknown";
        let customerEmail = "Unknown";

        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (!("deleted" in customer)) {
            customerName = customer.name ?? "Unknown";
            customerEmail = customer.email ?? "Unknown";
          }
        }

        const amount =
          invoice.amount_due != null
            ? `$${(invoice.amount_due / 100).toFixed(2)}`
            : "Unknown";

        await sendTelegram(
          `<b>Payment Failed</b>\n${customerName}\n${customerEmail}\nAmount: ${amount}`
        );
        break;
      }

      default:
        console.log(`Unhandled landing webhook event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing event ${event.type}:`, err);
  }

  // Always return 200 to prevent Stripe retries
  return NextResponse.json({ received: true });
}
