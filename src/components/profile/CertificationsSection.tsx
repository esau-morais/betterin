import {
	ArrowSquareOutIcon,
	PencilSimpleIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import type { Certification } from "#/lib/db/schema";

function EntityInitial({ name }: { name: string }) {
	return (
		<div className="size-12 shrink-0 rounded-xl bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
			{name[0]?.toUpperCase()}
		</div>
	);
}

export function CertificationsSection({
	certifications,
	isOwner,
	onAdd,
	onEdit,
}: {
	certifications: Certification[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: Certification) => void;
}) {
	return (
		<section
			className="bi-card animate-fade-up"
			aria-label="Licenses and certifications"
		>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">
					Licenses & Certifications
				</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add certification"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{certifications.map((cert) => {
					const issuedStr = cert.issueDate
						? `Issued ${cert.issueDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
						: null;
					const isExpired =
						cert.expirationDate && cert.expirationDate < new Date();
					const expirationStr = cert.expirationDate
						? `${isExpired ? "Expired" : "Expires"} ${cert.expirationDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
						: null;

					return (
						<div key={cert.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
							<EntityInitial name={cert.organization} />
							<div className="min-w-0 flex-1">
								<div className="flex items-start gap-2">
									<p className="font-medium text-foreground flex-1">
										{cert.name}
									</p>
									{isOwner && onEdit && (
										<button
											type="button"
											onClick={() => onEdit(cert)}
											className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
											aria-label={`Edit ${cert.name}`}
										>
											<PencilSimpleIcon className="size-3.5" />
										</button>
									)}
								</div>
								<p className="text-sm text-muted-foreground">
									{cert.organization}
									{issuedStr && ` · ${issuedStr}`}
								</p>
								{expirationStr &&
									(isExpired ? (
										<p className="text-sm text-destructive">{expirationStr}</p>
									) : (
										<p className="bi-mono text-text-tertiary">
											{expirationStr}
										</p>
									))}
								{cert.credentialUrl && (
									<a
										href={cert.credentialUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-1.5 inline-flex items-center gap-1 rounded text-sm font-medium text-brand hover:underline focus-ring"
									>
										<ArrowSquareOutIcon className="size-3.5" />
										Show credential
									</a>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
