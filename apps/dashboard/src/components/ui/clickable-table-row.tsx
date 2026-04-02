"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ClickableTableRowProps extends React.ComponentProps<"tr"> {
  href: string;
}

/**
 * A table row that preserves native link semantics while still supporting
 * pointer-based row click affordance. Keyboard navigation should rely on
 * links/buttons inside cells, not the row itself.
 */
export function ClickableTableRow({
  href,
  className,
  children,
  ...props
}: ClickableTableRowProps) {
  const router = useRouter();

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>) => {
      // Don't navigate if the click was on an interactive element
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, select, textarea")) return;
      router.push(href);
    },
    [href, router]
  );

  return (
    <tr
      data-slot="table-row"
      onClick={handleClick}
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b cursor-pointer transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}
