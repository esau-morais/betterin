import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils";

export function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

type FieldError = string | { message: string } | null | undefined;

function resolveError(error: FieldError): string | null {
	if (!error) return null;
	if (typeof error === "string") return error;
	return error.message;
}

export function FieldLabel({
	children,
	error: rawError,
	errorId,
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
	error?: FieldError;
	errorId?: string;
}) {
	const error = resolveError(rawError);
	return (
		<div className={cn("flex h-5 items-center justify-between", className)}>
			<Label {...props}>{children}</Label>
			<p
				id={errorId}
				role="alert"
				className={cn(
					"text-xs text-destructive transition-opacity",
					error ? "opacity-100" : "opacity-0",
				)}
			>
				{error || "\u00A0"}
			</p>
		</div>
	);
}
