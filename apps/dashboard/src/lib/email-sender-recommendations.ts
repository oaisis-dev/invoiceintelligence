type SupabaseLike = {
  from: (table: string) => unknown;
};

type ApprovalScope = "org" | "location";
type QueryError = { message: string } | null;

type SelectQuery<Row> = PromiseLike<{
  data: Row[] | null;
  error: QueryError;
}> & {
  eq: (column: string, value: string | null) => SelectQuery<Row>;
};

type UpdateQuery = {
  in: (column: string, values: string[]) => PromiseLike<{ error: QueryError }>;
};

function getTableQueries(supabase: SupabaseLike, table: string): {
  select: <Row>(columns: string) => SelectQuery<Row>;
  update: (values: Record<string, unknown>) => UpdateQuery;
} {
  return supabase.from(table) as {
    select: <Row>(columns: string) => SelectQuery<Row>;
    update: (values: Record<string, unknown>) => UpdateQuery;
  };
}

export async function getLocationOverrideIds(
  supabase: SupabaseLike,
  orgId: string
): Promise<Set<string>> {
  const { data, error } = await getTableQueries(supabase, "email_allowed_senders")
    .select<{ location_id: string | null }>("location_id")
    .eq("org_id", orgId);

  if (error) {
    throw new Error(`Failed to load location sender overrides: ${error.message}`);
  }

  return new Set(
    (data ?? [])
      .map((row: { location_id: string | null }) => row.location_id)
      .filter((locationId: string | null): locationId is string => Boolean(locationId))
  );
}

export async function approveSenderRecommendations(params: {
  supabase: SupabaseLike;
  orgId: string;
  senderEmail: string;
  scope: ApprovalScope;
  locationId: string | null;
  currentLocationId?: string | null;
}): Promise<{ approvedIds: string[]; blockedByOverride: boolean }> {
  const {
    supabase,
    orgId,
    senderEmail,
    scope,
    locationId,
    currentLocationId = locationId,
  } = params;

  const { data: recommendations, error: recommendationsError } = await getTableQueries(
    supabase,
    "email_sender_recommendations"
  )
    .select<{ id: string; location_id: string | null }>("id, location_id")
    .eq("org_id", orgId)
    .eq("sender_email", senderEmail);

  if (recommendationsError) {
    throw new Error(
      `Failed to load sender recommendations: ${recommendationsError.message}`
    );
  }

  const recommendationRows = recommendations ?? [];

  if (recommendationRows.length === 0) {
    return { approvedIds: [], blockedByOverride: false };
  }

  let approvedIds: string[];
  let blockedByOverride = false;

  if (scope === "location") {
    approvedIds = recommendationRows
      .filter((recommendation) => recommendation.location_id === locationId)
      .map((recommendation) => recommendation.id);
  } else {
    const locationOverrideIds = await getLocationOverrideIds(supabase, orgId);
    approvedIds = recommendationRows
      .filter(
        (recommendation) =>
          recommendation.location_id === null ||
          !locationOverrideIds.has(recommendation.location_id)
      )
      .map((recommendation) => recommendation.id);

    blockedByOverride =
      currentLocationId !== null &&
      recommendationRows.some(
        (recommendation) =>
          recommendation.location_id === currentLocationId &&
          locationOverrideIds.has(currentLocationId)
      ) &&
      !approvedIds.some((id) =>
        recommendationRows.some(
          (recommendation) =>
            recommendation.id === id &&
            recommendation.location_id === currentLocationId
        )
      );
  }

  if (approvedIds.length === 0) {
    return { approvedIds: [], blockedByOverride };
  }

  const { error: updateError } = await getTableQueries(
    supabase,
    "email_sender_recommendations"
  )
    .update({ status: "approved" })
    .in("id", approvedIds);

  if (updateError) {
    throw new Error(`Failed to update sender recommendations: ${updateError.message}`);
  }

  return { approvedIds, blockedByOverride };
}
