/**
 * Mock Supabase client with a chainable query builder.
 *
 * Usage in tests:
 * ```ts
 * import { createMockSupabaseClient, mockQueryResult } from "@/test/mocks/supabase";
 *
 * vi.mock("@/lib/supabase/server", () => ({
 *   createServerClient: vi.fn().mockResolvedValue(createMockSupabaseClient()),
 * }));
 * ```
 *
 * To configure specific return values:
 * ```ts
 * const client = createMockSupabaseClient();
 * mockQueryResult(client, { data: [invoice], count: 1, error: null });
 * ```
 */

export type MockQueryResult = {
  data: unknown;
  count?: number | null;
  error: { message: string; code: string } | null;
};

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

const CHAINABLE_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "or",
  "not",
  "order",
  "limit",
  "range",
] as const;

/**
 * Creates a chainable mock query builder.
 * Every method returns `this` for chaining.
 * Terminal methods (single, maybeSingle, or awaiting the builder) resolve to
 * the configured result.
 */
function createMockQueryBuilder(
  result: MockQueryResult = { data: [], count: 0, error: null }
): MockQueryBuilder {
  const builder = {} as MockQueryBuilder;

  // All chainable methods return the builder itself
  for (const method of CHAINABLE_METHODS) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods resolve with the result
  builder.single = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);

  // Make the builder thenable so `await supabase.from(...).select(...)` works
  builder.then = vi.fn((resolve: (value: MockQueryResult) => void) =>
    resolve(result)
  );

  return builder;
}

export type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  /** Internal: the default query builder for inspection */
  _queryBuilder: MockQueryBuilder;
};

/**
 * Creates a mock Supabase client. All `.from()` calls return the same
 * chainable query builder by default.
 */
export function createMockSupabaseClient(
  defaultResult: MockQueryResult = { data: [], count: 0, error: null }
): MockSupabaseClient {
  const queryBuilder = createMockQueryBuilder(defaultResult);

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test_user_id" } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test_token" } },
        error: null,
      }),
    },
    _queryBuilder: queryBuilder,
  };
}

/**
 * Reconfigure the default result for subsequent queries.
 */
export function mockQueryResult(
  client: MockSupabaseClient,
  result: MockQueryResult
): void {
  const builder = createMockQueryBuilder(result);
  client.from.mockReturnValue(builder);
  (client as unknown as { _queryBuilder: MockQueryBuilder })._queryBuilder =
    builder;
}
