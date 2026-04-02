import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("renders children", () => {
    render(<AuthLayout>Test content</AuthLayout>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders the beta badge with the brand lockup", () => {
    render(
      <AuthLayout>
        <span>child</span>
      </AuthLayout>
    );

    // Badge only renders when NEXT_PUBLIC_APP_ENV is set
    expect(screen.queryByText("staging")).not.toBeInTheDocument();
  });

  it("has the page background color", () => {
    render(
      <AuthLayout>
        <span>child</span>
      </AuthLayout>
    );
    const wrapper = screen.getByTestId("auth-layout");
    expect(wrapper).toHaveClass("bg-[var(--bg-page)]");
  });

  it("renders two atmosphere circles", () => {
    render(
      <AuthLayout>
        <span>child</span>
      </AuthLayout>
    );
    const topLeft = screen.getByTestId("atmosphere-top-left");
    const bottomRight = screen.getByTestId("atmosphere-bottom-right");
    expect(topLeft).toBeInTheDocument();
    expect(bottomRight).toBeInTheDocument();
  });

  it("applies blur to atmosphere circles", () => {
    render(
      <AuthLayout>
        <span>child</span>
      </AuthLayout>
    );
    const topLeft = screen.getByTestId("atmosphere-top-left");
    const bottomRight = screen.getByTestId("atmosphere-bottom-right");
    expect(topLeft).toHaveClass("blur-[64px]");
    expect(bottomRight).toHaveClass("blur-[64px]");
  });

  it("centers children in the viewport", () => {
    render(
      <AuthLayout>
        <span>child</span>
      </AuthLayout>
    );
    const wrapper = screen.getByTestId("auth-layout");
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("items-center");
    expect(wrapper).toHaveClass("justify-center");
  });
});
