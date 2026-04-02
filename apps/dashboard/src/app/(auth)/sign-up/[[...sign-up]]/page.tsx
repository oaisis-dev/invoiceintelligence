import { SignUp } from "@clerk/nextjs";

interface SignUpPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { plan } = await searchParams;
  const redirectUrl = plan
    ? `/getting-started?plan=${encodeURIComponent(plan)}`
    : "/getting-started";

  return (
    <div className="flex w-[875px] flex-col items-center px-4 py-4">
      <SignUp
        forceRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full shadow-none bg-transparent p-0",
            headerTitle:
              "text-[30px] font-semibold leading-10 tracking-[0.07px] text-[var(--text-primary)]",
            headerSubtitle:
              "text-[17px] leading-6 text-[var(--text-secondary)]",
            formFieldLabel:
              "text-[17px] font-medium text-[var(--text-primary)]",
            formFieldInput:
              "h-11 rounded-[var(--radius-sm)] border border-[var(--border-input)] bg-[var(--bg-input)] text-[17px] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]/50",
            formButtonPrimary:
              "h-11 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[17px] font-medium hover:bg-[var(--primary)]/90",
            footerActionLink:
              "text-[var(--primary)] font-medium hover:underline",
            socialButtonsBlockButton:
              "h-11 rounded-[var(--radius-sm)] border border-[var(--border-input)] bg-[var(--bg-input)] text-[17px] font-medium text-[var(--text-primary)] hover:bg-white/70",
          },
        }}
      />
    </div>
  );
}
