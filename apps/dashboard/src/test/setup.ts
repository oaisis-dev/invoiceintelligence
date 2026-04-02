import "@testing-library/jest-dom/vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Global mocks for Next.js and Clerk — applied to every test file.
// ---------------------------------------------------------------------------

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock next/link — render a plain <a> tag using React.createElement (no JSX in .ts)
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Mock @clerk/nextjs (client-side hooks)
vi.mock("@clerk/nextjs", () => ({
  auth: () => ({
    userId: "test_user_id",
    getToken: vi.fn().mockResolvedValue("test_token"),
  }),
  currentUser: vi.fn(),
  useSession: () => ({
    session: {
      getToken: vi.fn().mockResolvedValue("test_token"),
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      id: "test_user_id",
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "test@example.com" },
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    userId: "test_user_id",
    isLoaded: true,
    isSignedIn: true,
    getToken: vi.fn().mockResolvedValue("test_token"),
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => null,
  SignUp: () => null,
}));

// Mock @clerk/nextjs/server (server-side auth)
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => ({
    userId: "test_user_id",
    getToken: vi.fn().mockResolvedValue("test_token"),
  }),
  currentUser: vi.fn().mockResolvedValue({
    id: "test_user_id",
    fullName: "Test User",
    primaryEmailAddress: { emailAddress: "test@example.com" },
  }),
}));

// Mock server-only to prevent errors in test environment
vi.mock("server-only", () => ({}));

// Polyfills for Radix UI and motion APIs in jsdom.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
