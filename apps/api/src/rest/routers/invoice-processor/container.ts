/**
 * Dependency injection container — creates repos and services from env config.
 *
 * Translated from backend/api/src/dependencies.py (ServiceContainer + AdminContainer).
 *
 * NOTE: The concrete repo/service classes are expected to live in
 * @invoiceprocessor/shared once that package is published. Until then we
 * declare explicit interfaces here so the route layer type-checks cleanly
 * under noUncheckedIndexedAccess.
 */

// ---------------------------------------------------------------------------
// Stub interfaces — replace with real imports from @invoiceprocessor/shared
// once available.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Minimal DB wrapper — wraps a Supabase JS client. */
export interface SupabaseClientManager {
  client: {
    rpc: (fn: string, params: Record<string, unknown>) => { execute: () => void };
    table: (name: string) => {
      select: (cols: string) => {
        in_: (col: string, values: string[]) => {
          execute: () => { data: Record<string, unknown>[] | null };
        };
      };
    };
  };
}

export interface EmailSenderPort {
  send: (msg: {
    toEmail: string;
    toName: string | null;
    subject: string;
    htmlContent: string;
    replyTo?: string;
  }) => Promise<void>;
}

// -- Service interfaces (explicit methods used by routes) ---------------------

export interface OrgFieldService {
  listAll: (orgId: string) => Any;
  getSystemFields: () => Any;
  createCustom: (orgId: string, data: Any) => Any;
  ensureOrgField: (orgId: string, systemFieldId: string) => Any;
  update: (orgId: string, fieldId: string, data: Any) => Any;
  delete: (orgId: string, fieldId: string) => void;
}

export interface OrgMappingService {
  listAll: (orgId: string) => Any;
  get: (orgId: string, mappingId: string) => Any;
  create: (orgId: string, data: Any, systemFieldId?: string) => Any;
  update: (orgId: string, mappingId: string, data: Any) => Any;
  delete: (orgId: string, mappingId: string) => void;
}

export interface OrgCategoryService {
  listActiveCategories: (orgId: string) => Any;
  getSystemCategories: () => Any;
  createCategory: (orgId: string, data: Any) => Any;
  ensureOrgCategory: (orgId: string, systemCategoryId: string) => Any;
  updateCategory: (orgId: string, categoryId: string, data: Any) => Any;
  deleteCategory: (orgId: string, categoryId: string) => void;
  listActiveRules: (orgId: string) => Any;
  createRule: (orgId: string, data: Any, systemCategoryId?: string) => Any;
  updateRule: (orgId: string, ruleId: string, data: Any) => Any;
  deleteRule: (orgId: string, ruleId: string) => void;
}

export interface OrgSettingsService {
  listAll: (orgId: string) => Any;
  listVendorOverrides: (orgId: string, vendorNamePattern: string) => Any;
  listOrgDefaults: (orgId: string) => Any;
  create: (orgId: string, data: Any) => Any;
  update: (orgId: string, settingId: string, data: Any) => Any;
  delete: (orgId: string, settingId: string) => void;
}

export interface OrgRecommendationService {
  listPendingTerms: (orgId: string) => Any;
  getTerm: (orgId: string, recId: string) => Any;
  resolveTerm: (orgId: string, recId: string, mappingId: string) => Any;
  dismissTerm: (orgId: string, recId: string) => Any;
  listPendingCategories: (orgId: string) => Any;
  getCategory: (orgId: string, recId: string) => Any;
  resolveCategory: (orgId: string, recId: string, ruleId: string) => Any;
  dismissCategory: (orgId: string, recId: string) => Any;
}

export interface SystemConfigService {
  listFields: () => Any;
  createField: (data: Any) => Any;
  updateField: (fieldId: string, data: Any) => Any;
  listMappings: () => Any;
  createMapping: (data: Any) => Any;
  updateMapping: (mappingId: string, data: Any) => Any;
  listCategories: () => Any;
  createCategory: (data: Any) => Any;
  updateCategory: (categoryId: string, data: Any) => Any;
  listRules: () => Any;
  createRule: (data: Any) => Any;
  updateRule: (ruleId: string, data: Any) => Any;
  listSettings: () => Any;
  createSetting: (data: Any) => Any;
  updateSetting: (settingId: string, data: Any) => Any;
}

export interface SystemRecommendationService {
  listPendingTerms: () => Any;
  promoteTerm: (recId: string, promotedToId: string | null, adminId: string) => Any;
  dismissTerm: (recId: string, adminId: string) => Any;
  listPendingCategories: () => Any;
  promoteCategory: (recId: string, promotedToId: string | null, adminId: string) => Any;
  dismissCategory: (recId: string, adminId: string) => Any;
  onOrgTermMappingCreated: (input: {
    rawLabel: string;
    sectionType: string;
    suggestedFieldKey: string;
    vendorNamePattern: string | null;
  }) => void;
  onOrgCategoryRuleCreated: (input: {
    rawDescription: string;
    suggestedCategoryCode: string;
    vendorNamePattern: string | null;
  }) => void;
}

export interface CorrectionDetectionService {
  detectAndSave: (input: {
    orgId: string;
    invoiceId: string;
    vendorName: string | null;
    original: Record<string, unknown>;
    corrected: Record<string, unknown>;
  }) => Array<{ correctionType: string; details: unknown }>;
}

export interface FormatOptionsService {
  listAll: () => Any;
  getGrouped: () => Record<string, Any[]>;
  listByKey: (settingKey: string) => Any;
}

export interface NotificationService {
  appendActivityEvent: (event: Any) => string;
  listNotifications: (userId: string, opts: Any) => Any;
  unreadCount: (userId: string) => number;
  markRead: (userId: string, notificationIds: string[]) => void;
  markAllRead: (userId: string) => void;
  dismiss: (userId: string, notificationIds: string[]) => void;
  getPreferences: (userId: string, orgId: string) => Any;
  upsertPreference: (userId: string, orgId: string, category: string, opts: Any) => Any;
  listEventsForResource: (orgId: string, resourceType: string, resourceId: string, limit: number) => Any;
  listAdminNotifications: (adminId: string, opts: Any) => Any;
  adminUnreadCount: (adminId: string) => number;
  adminMarkRead: (adminId: string, notificationIds: string[]) => void;
  adminMarkAllRead: (adminId: string) => void;
  adminDismiss: (adminId: string, notificationIds: string[]) => void;
}

// -- Admin repo interfaces ----------------------------------------------------

export interface PlatformAdminRepo {
  listAll: () => Any;
  create: (data: Any) => Any;
  update: (adminId: string, data: Any) => Any;
  delete: (adminId: string) => void;
}

export interface OrganizationAdminRepo {
  listPaginated: (opts: { search: string | null; page: number; perPage: number }) => Any;
  getDetail: (orgId: string) => Any;
}

export interface UserAdminRepo {
  listPaginated: (opts: { search: string | null; page: number; perPage: number }) => Any;
}

export interface SubscriptionAdminRepo {
  listPlans: () => Any;
  upsertPlan: (data: Any) => Any;
  getOrgSubscription: (orgId: string) => Any;
  updateOrgSubscription: (orgId: string, data: Any) => void;
}

export interface PlatformSettingsRepo {
  listAll: () => Any;
  upsert: (key: string, value: unknown, updatedBy: string) => void;
  getByKey: (key: string) => { value: unknown } | null;
}

export interface StatsRepo {
  getPlatformStats: () => Any;
}

export interface ContactRequestRepo {
  listAll: () => Any;
  create: (data: Any) => Any;
  updateStatus: (requestId: string, status: string, respondedBy: string) => void;
}

// -- Container interfaces -----------------------------------------------------

export interface AdminContainer {
  platformAdmin: PlatformAdminRepo;
  organization: OrganizationAdminRepo;
  user: UserAdminRepo;
  subscription: SubscriptionAdminRepo;
  platformSettings: PlatformSettingsRepo;
  stats: StatsRepo;
  contactRequest: ContactRequestRepo;
}

export interface ServiceContainer {
  db: SupabaseClientManager;
  admin: AdminContainer;
  orgFieldService: OrgFieldService;
  orgMappingService: OrgMappingService;
  orgCategoryService: OrgCategoryService;
  orgSettingsService: OrgSettingsService;
  orgRecommendationService: OrgRecommendationService;
  systemConfigService: SystemConfigService;
  systemRecommendationService: SystemRecommendationService;
  correctionDetectionService: CorrectionDetectionService;
  formatOptionsService: FormatOptionsService;
  notificationService: NotificationService;
  emailSender: EmailSenderPort;
}

/**
 * Build a ServiceContainer from environment variables.
 *
 * Mirrors Python `ServiceContainer.from_env()`. The actual instantiation
 * depends on concrete classes from @invoiceprocessor/shared.
 */
export function createContainerFromEnv(): ServiceContainer {
  throw new Error(
    "createContainerFromEnv: Not yet wired — waiting for @invoiceprocessor/shared repo/service exports",
  );
}
