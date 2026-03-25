import { CaretDownIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { cn } from "#/lib/utils";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
	size?: "sm" | "default";
};

function NativeSelect({
	className,
	size = "default",
	...props
}: NativeSelectProps) {
	return (
		<div
			className={cn(
				"group/native-select relative w-fit has-[select:disabled]:opacity-50",
				className,
			)}
			data-slot="native-select-wrapper"
			data-size={size}
		>
			<select
				data-slot="native-select"
				data-size={size}
				className="border-transparent text-foreground bg-transparent bg-clip-padding shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.08] placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive/60 h-8 w-full min-w-0 appearance-none rounded-lg border py-1 pr-8 pl-2.5 text-sm transition-[color,box-shadow] select-none data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=sm]:py-0.5 outline-none disabled:pointer-events-none disabled:cursor-not-allowed dark:bg-input/30 dark:ring-white/[0.1] dark:shadow-black/25 dark:focus-visible:shadow-black/20 dark:aria-invalid:ring-destructive/50"
				{...props}
			/>
			<CaretDownIcon
				className="text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2 pointer-events-none absolute select-none"
				aria-hidden="true"
				data-slot="native-select-icon"
			/>
		</div>
	);
}

function NativeSelectOption({
	className,
	...props
}: React.ComponentProps<"option">) {
	return (
		<option
			data-slot="native-select-option"
			className={cn("bg-background text-foreground", className)}
			{...props}
		/>
	);
}

function NativeSelectOptGroup({
	className,
	...props
}: React.ComponentProps<"optgroup">) {
	return (
		<optgroup
			data-slot="native-select-optgroup"
			className={cn(className)}
			{...props}
		/>
	);
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
