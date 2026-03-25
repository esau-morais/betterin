import type { ReactNode } from "react";

export function LegalPageLayout({
	category,
	title,
	lastUpdated,
	children,
}: {
	category: string;
	title: string;
	lastUpdated: string;
	children: ReactNode;
}) {
	return (
		<main className="mx-auto max-w-3xl px-6 pt-24 pb-16">
			<header className="mb-12">
				<p className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
					{category}
				</p>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					{title}
				</h1>
				<p className="mt-3 font-mono text-xs text-muted-foreground">
					Last updated: {lastUpdated}
				</p>
			</header>
			<div className="space-y-10 text-base leading-relaxed text-muted-foreground">
				{children}
			</div>
		</main>
	);
}
