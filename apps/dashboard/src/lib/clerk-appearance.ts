import { Appearance } from "@clerk/types";
import { dark } from "@clerk/themes";

export const getClerkAppearance = (theme: string | undefined): Appearance => {
    const isDark = theme === "dark";

    return {
        baseTheme: isDark ? dark : undefined,
        variables: {
            colorPrimary: "#10b981", // Emerald 500
        },
        elements: {
            card: "shadow-xl border border-slate-200 dark:border-slate-800",
            rootBox: "mx-auto",
        },
    };
};
