import { describe, it, expect, vi } from "vitest";

// Mock Clerk's SignIn component since it requires ClerkProvider context
vi.mock("@clerk/nextjs", () => ({
  SignIn: ({ appearance }: { appearance?: unknown }) => (
    <div data-testid="clerk-sign-in" data-appearance={JSON.stringify(appearance)}>
      Clerk SignIn
    </div>
  ),
}));

// Dynamic import after mock is set up
const { default: SignInPage } = await import("./[[...sign-in]]/page");

const { render, screen } = await import("@testing-library/react");

describe("SignInPage", () => {
  it("renders the Clerk SignIn component", () => {
    render(<SignInPage />);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("wraps content in a container div", () => {
    render(<SignInPage />);
    const card = screen.getByTestId("sign-in-card");
    expect(card).toBeInTheDocument();
  });
});
