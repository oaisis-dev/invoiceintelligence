import "server-only";

import { PubSub, type Topic } from "@google-cloud/pubsub";

let _topic: Topic | null = null;

function getTopic(): Topic {
  if (!_topic) {
    const projectId = process.env.GCP_PROJECT_ID;
    const topicName = process.env.PUBSUB_TOPIC;
    if (!projectId) throw new Error("GCP_PROJECT_ID env var is required");
    if (!topicName) throw new Error("PUBSUB_TOPIC env var is required");
    _topic = new PubSub({ projectId }).topic(topicName);
  }
  return _topic;
}

interface InvoiceProcessingMessage {
  invoice_id: string;
  org_id: string;
  attempt: number;
  source: string;
}

/**
 * Publish an invoice processing message to Pub/Sub.
 * Message format matches workers/src/domain/events.py:PubSubMessage.
 */
export async function publishInvoiceProcessing(
  message: InvoiceProcessingMessage
): Promise<string> {
  const data = Buffer.from(JSON.stringify(message));
  const messageId = await getTopic().publishMessage({ data });
  return messageId;
}
