import type * as React from "react";

import { cn } from "#/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-lg border border-transparent bg-transparent bg-clip-padding shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.08] px-2.5 py-2 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-md focus-visible:shadow-black/[0.06] disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/60 md:text-sm autofill:shadow-[inset_0_0_0_1000px_var(--color-card)] autofill:[-webkit-text-fill-color:var(--color-foreground)] dark:bg-input/30 dark:ring-white/[0.1] dark:shadow-black/25 dark:focus-visible:shadow-black/20 dark:disabled:bg-input/80 dark:aria-invalid:ring-destructive/50",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
