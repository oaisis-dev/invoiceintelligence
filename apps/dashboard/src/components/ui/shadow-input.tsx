import * as React from "react"

import { cn } from "@/lib/utils"

function ShadowInput({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-white/80 dark:bg-slate-900/80 px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:focus-visible:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                className
            )}
            {...props}
        />
    )
}

export { ShadowInput }
