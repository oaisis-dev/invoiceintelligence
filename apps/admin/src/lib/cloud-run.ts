/**
 * Cloud Run Admin API v2 client for maintenance mode traffic management.
 *
 * Uses the admin service account's Application Default Credentials
 * (automatically available on Cloud Run via the metadata server).
 */

import "server-only";

import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const REGION = process.env.GCP_REGION ?? "us-central1";
const FRONTEND_SERVICE =
  process.env.FRONTEND_SERVICE_NAME ?? "invoice-frontend";

const SERVICE_PATH = `projects/${PROJECT_ID}/locations/${REGION}/services/${FRONTEND_SERVICE}`;
const BASE_URL = "https://run.googleapis.com/v2";

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken(): Promise<string> {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error("Failed to obtain access token from Google Auth");
  }
  return tokenResponse.token;
}

// ── Types ──────────────────────────────────────────────────────────

type TrafficTarget = {
  type:
    | "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    | "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION";
  revision?: string;
  percent: number;
  tag?: string;
};

type TrafficStatus = {
  type: string;
  revision: string;
  percent: number;
  tag?: string;
  uri?: string;
};

type ServiceResponse = {
  name: string;
  traffic?: TrafficTarget[];
  trafficStatuses?: TrafficStatus[];
};

type RevisionContainer = {
  image: string;
};

type Revision = {
  name: string;
  containers?: RevisionContainer[];
};

type RevisionsResponse = {
  revisions?: Revision[];
};

export type MaintenanceStatus = {
  enabled: boolean;
  maintenancePercent: number;
};

// ── Public API ─────────────────────────────────────────────────────

/**
 * Read current traffic split and determine if maintenance mode is active.
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/${SERVICE_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud Run API error (${res.status}): ${text}`);
  }

  const service: ServiceResponse = await res.json();

  const maintenanceTarget = service.trafficStatuses?.find(
    (t) => t.tag === "maintenance"
  );

  return {
    enabled: (maintenanceTarget?.percent ?? 0) === 100,
    maintenancePercent: maintenanceTarget?.percent ?? 0,
  };
}

/**
 * Enable maintenance mode: route 100% traffic to the "maintenance" tagged revision.
 */
export async function enableMaintenanceMode(): Promise<void> {
  // The v2 API requires the revision name when using REVISION type.
  // Look up the revision name from the current traffic statuses.
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/${SERVICE_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud Run API error (${res.status}): ${text}`);
  }

  const service: ServiceResponse = await res.json();
  const maintenanceTarget = service.trafficStatuses?.find(
    (t) => t.tag === "maintenance"
  );

  if (!maintenanceTarget?.revision) {
    throw new Error(
      "No maintenance tagged revision found. Deploy the maintenance container with --tag maintenance first."
    );
  }

  await updateTraffic([
    {
      type: "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
      revision: maintenanceTarget.revision,
      percent: 100,
      tag: "maintenance",
    },
  ]);
}

/**
 * Disable maintenance mode: route 100% traffic back to the app revision.
 *
 * We can't use TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST because deploying the
 * maintenance container makes it the "latest" revision. Instead, we list
 * recent revisions via the Revisions API and find the most recent one whose
 * image is NOT the maintenance container.
 */
export async function disableMaintenanceMode(): Promise<void> {
  const token = await getAccessToken();

  // Get current service state (for the maintenance revision name)
  const svcRes = await fetch(`${BASE_URL}/${SERVICE_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!svcRes.ok) {
    const text = await svcRes.text();
    throw new Error(`Cloud Run API error (${svcRes.status}): ${text}`);
  }
  const service: ServiceResponse = await svcRes.json();
  const maintenanceRevision = service.trafficStatuses?.find(
    (t) => t.tag === "maintenance"
  );

  // List recent revisions to find the most recent non-maintenance one
  const revRes = await fetch(
    `${BASE_URL}/${SERVICE_PATH}/revisions?pageSize=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!revRes.ok) {
    const text = await revRes.text();
    throw new Error(`Cloud Run API error (${revRes.status}): ${text}`);
  }

  const revData: RevisionsResponse = await revRes.json();
  const appRevision = revData.revisions?.find((r) => {
    const image = r.containers?.[0]?.image ?? "";
    return !image.includes("maintenance");
  });

  if (!appRevision) {
    throw new Error(
      "Could not find a non-maintenance revision to restore. Manual intervention required: " +
        "gcloud run services update-traffic --to-revisions=<REVISION>=100"
    );
  }

  // Extract short revision name from full resource path
  const appRevisionName = appRevision.name.split("/").pop()!;

  const traffic: TrafficTarget[] = [
    {
      type: "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
      revision: appRevisionName,
      percent: 100,
    },
  ];

  // Preserve the maintenance tag at 0% so it can be re-enabled later
  if (maintenanceRevision?.revision) {
    traffic.push({
      type: "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION",
      revision: maintenanceRevision.revision,
      percent: 0,
      tag: "maintenance",
    });
  }

  await updateTraffic(traffic);
}

// ── Internal ───────────────────────────────────────────────────────

async function updateTraffic(traffic: TrafficTarget[]): Promise<void> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/${SERVICE_PATH}?updateMask=traffic`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ traffic }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud Run API error (${res.status}): ${text}`);
  }
}
