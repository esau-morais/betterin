import {
	Body,
	Container,
	Font,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";

const tailwindConfig = {
	theme: {
		extend: {
			colors: {
				brand: "#2563EB",
				"brand-dark": "#4C9AFF",
				"bg-outer": "#F9FAFB",
				"bg-card": "#FFFFFF",
				"text-primary": "#111827",
				"text-secondary": "#6B7280",
				"border-light": "#E5E7EB",
			},
			borderRadius: {
				card: "12px",
			},
		},
	},
};

const darkModeStyles = `
  @media (prefers-color-scheme: dark) {
    body { background-color: #111111 !important; }
    .outer-wrap { background-color: #111111 !important; }
    .inner-card { background-color: #0A0A0A !important; }
    .heading { color: #F9FAFB !important; }
    .body-text { color: #A1A1AA !important; }
    .divider { border-color: #2A2A2A !important; }
    .code-box { background-color: #1A1A1A !important; border-color: #2A2A2A !important; }
    .code-text { color: #F9FAFB !important; }
    .logo-better { color: #F9FAFB !important; }
    .logo-in { color: #4C9AFF !important; }
  }
`;

interface EmailLayoutProps {
	preview: string;
	children: ReactNode;
	footer?: ReactNode;
}

export function EmailLayout({ preview, children, footer }: EmailLayoutProps) {
	return (
		<Html lang="en">
			<Head>
				<Font
					fontFamily="Geist"
					fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
					webFont={{
						url: "https://cdn.jsdelivr.net/npm/@fontsource-variable/geist@5.2.8/files/geist-latin-wght-normal.woff2",
						format: "woff2",
					}}
					fontWeight="300 700"
					fontStyle="normal"
				/>
				<Font
					fontFamily="Geist Mono"
					fallbackFontFamily="monospace"
					webFont={{
						url: "https://cdn.jsdelivr.net/npm/@fontsource-variable/geist-mono@5.2.7/files/geist-mono-latin-wght-normal.woff2",
						format: "woff2",
					}}
					fontWeight="400 500"
					fontStyle="normal"
				/>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: dark mode CSS must be injected as a style block for email clients */}
				<style dangerouslySetInnerHTML={{ __html: darkModeStyles }} />
			</Head>
			<Preview>{preview}</Preview>
			<Tailwind config={tailwindConfig}>
				<Body className="outer-wrap mx-0 my-0 bg-bg-outer px-4 pb-6 pt-10 font-[Geist,Helvetica,Arial,sans-serif]">
					<Container className="inner-card mx-auto max-w-[400px] rounded-card bg-bg-card px-7 py-8">
						<Section className="mb-6">
							<span className="logo-better text-lg font-semibold tracking-tight text-text-primary">
								Better{" "}
							</span>
							<span className="logo-in text-lg font-semibold tracking-tight text-brand">
								In
							</span>
						</Section>

						<Hr className="divider mx-0 mb-6 mt-0 border-border-light" />

						{children}

						{footer && (
							<>
								<Hr className="divider mx-0 mb-5 mt-0 border-border-light" />
								{footer}
							</>
						)}
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
