import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "#/lib/utils";

export const inputVariants = cva(
	"w-full min-w-0 rounded-full border border-transparent bg-transparent bg-clip-padding shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.08] text-base transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-md focus-visible:shadow-black/[0.06] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/60 md:text-sm autofill:shadow-[inset_0_0_0_1000px_var(--color-card)] autofill:[-webkit-text-fill-color:var(--color-foreground)] dark:bg-input/30 dark:ring-white/[0.1] dark:shadow-black/25 dark:focus-visible:shadow-black/20 dark:disabled:bg-input/80 dark:aria-invalid:ring-destructive/50",
	{
		variants: {
			size: {
				default: "h-12 px-4 py-2 file:h-8 file:text-sm",
				sm: "h-10 px-3.5 py-1.5 file:h-7 file:text-sm",
				lg: "h-14 px-5 py-2.5 file:h-9 file:text-sm",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

export function Input({
	className,
	type,
	size,
	...props
}: Omit<React.ComponentProps<"input">, "size"> &
	VariantProps<typeof inputVariants>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(inputVariants({ size, className }))}
			{...props}
		/>
	);
}
