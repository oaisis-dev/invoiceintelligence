/**
 * Pub/Sub notification publisher.
 *
 * Translated from backend/shared/src/notifications/publisher.py
 * Publishes activity event IDs to a notification-dispatch topic
 * so the dispatcher service can fan out notifications.
 */

import { PubSub } from "@google-cloud/pubsub";

export interface NotificationPublisher {
  publish(activityEventId: string): Promise<string | null>;
}

export class PubSubNotificationPublisher implements NotificationPublisher {
  private readonly projectId: string;
  private readonly topicName: string;
  private client: PubSub | null = null;

  constructor(projectId: string, topicName = "notification-dispatch") {
    this.projectId = projectId;
    this.topicName = topicName;
  }

  private getClient(): PubSub {
    if (!this.client) {
      this.client = new PubSub({ projectId: this.projectId });
    }
    return this.client;
  }

  async publish(activityEventId: string): Promise<string | null> {
    try {
      const client = this.getClient();
      const topic = client.topic(this.topicName);
      const data = Buffer.from(
        JSON.stringify({ activity_event_id: activityEventId }),
      );
      const messageId = await topic.publishMessage({ data });
      console.debug(
        `Published notification dispatch ${activityEventId} (msg=${messageId})`,
      );
      return messageId;
    } catch (err) {
      console.error(
        `Failed to publish notification dispatch for ${activityEventId}:`,
        err,
      );
      return null;
    }
  }
}

export class NoOpNotificationPublisher implements NotificationPublisher {
  async publish(activityEventId: string): Promise<string | null> {
    console.debug(`NoOp notification publish: ${activityEventId}`);
    return null;
  }
}
