import { CheckCircleIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { FieldLabel } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { applyToJobFn } from "#/lib/server/jobs";

type EasyApplySheetProps = {
	jobId: string;
	jobTitle: string;
	company: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApplied: () => void;
};

export function EasyApplySheet({
	jobId,
	jobTitle,
	company,
	open,
	onOpenChange,
	onApplied,
}: EasyApplySheetProps) {
	const queryClient = useQueryClient();
	const [submitted, setSubmitted] = useState(false);

	const mutation = useMutation({
		mutationFn: (message: string | undefined) =>
			applyToJobFn({ data: { jobId, message } }),
		onSuccess: () => {
			setSubmitted(true);
			onApplied();
			queryClient.invalidateQueries({ queryKey: ["my-applications"] });
		},
	});

	const form = useForm({
		defaultValues: { message: "" },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value.message || undefined);
		},
	});

	function handleOpenChange(next: boolean) {
		if (!next) {
			form.reset();
			setSubmitted(false);
			mutation.reset();
		}
		onOpenChange(next);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{submitted ? (
					<div className="flex flex-col items-center gap-3 py-6 text-center">
						<CheckCircleIcon
							className="size-12 text-emerald-500"
							weight="fill"
						/>
						<p className="text-base font-semibold text-foreground">
							Application submitted!
						</p>
						<p className="text-sm text-muted-foreground">
							Your application to{" "}
							<span className="font-medium text-foreground">{company}</span> has
							been sent.
						</p>
						<Button
							variant="outline"
							className="mt-2"
							onClick={() => handleOpenChange(false)}
						>
							Close
						</Button>
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						noValidate
					>
						<DialogHeader>
							<DialogTitle>Easy Apply</DialogTitle>
							<p className="text-sm text-muted-foreground">
								{jobTitle} · {company}
							</p>
						</DialogHeader>

						<div className="mt-4 space-y-3">
							<form.Field name="message">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel htmlFor="apply-message">
											Message{" "}
											<span className="font-normal text-muted-foreground">
												(optional)
											</span>
										</FieldLabel>
										<Textarea
											id="apply-message"
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(e.target.value.slice(0, 2000))
											}
											onBlur={field.handleBlur}
											maxLength={2000}
											rows={5}
											placeholder="Introduce yourself or explain why you're a great fit..."
											className="resize-none"
										/>
										<p className="text-right text-xs text-muted-foreground tabular-nums">
											{field.state.value.length}/2,000
										</p>
									</div>
								)}
							</form.Field>

							{mutation.error && (
								<p className="text-sm text-destructive">
									{mutation.error.message}
								</p>
							)}
						</div>

						<DialogFooter className="mt-4">
							<form.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button
										type="submit"
										disabled={isSubmitting}
										className="w-full sm:w-auto"
									>
										{isSubmitting ? "Submitting..." : "Submit Application"}
									</Button>
								)}
							</form.Subscribe>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
