import geistLatinWoff2 from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import geistMonoLatinWoff2 from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	ScriptOnce,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { Toaster } from "#/components/ui/sonner";
import { TooltipProvider } from "#/components/ui/tooltip";
import { getSessionFn } from "#/lib/server/auth";
import { getProfileFn } from "#/lib/server/profile";
import type { RouterContext } from "#/router";
import appCss from "../styles.css?url";

const SITE_URL = (import.meta.env.VITE_SITE_URL ??
	"http://localhost:3000") as string;

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('bi-theme');var d=s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`;

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Better In" },
			{
				name: "description",
				content: "A faster, privacy-first social network.",
			},
			{ property: "og:site_name", content: "Better In" },
			{ property: "og:type", content: "website" },
			{ property: "og:locale", content: "en_US" },
			{
				property: "og:image",
				content: `${SITE_URL}/assets/og-default.png`,
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "theme-color", content: "#2563EB" },
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
			{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/manifest.json" },
			{
				rel: "preload",
				href: geistLatinWoff2,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{
				rel: "preload",
				href: geistMonoLatinWoff2,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{ rel: "stylesheet", href: appCss },
		],
	}),
	beforeLoad: async ({ context }) => {
		if (context.session !== undefined && context.profile !== undefined) return;
		const session = context.session ?? (await getSessionFn());
		if (!session) return { session: null, profile: null };
		const profile = context.profile ?? (await getProfileFn());
		return { session, profile };
	},
	shellComponent: RootDocument,
});

function RootDocument({ children: _children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<ScriptOnce>{THEME_SCRIPT}</ScriptOnce>
				<HeadContent />
			</head>
			<body className="bg-background text-foreground font-sans antialiased [overflow-wrap:anywhere]">
				<LazyMotion features={domAnimation} strict>
					<MotionConfig reducedMotion="user">
						<TooltipProvider delayDuration={300}>
							<Outlet />
							{import.meta.env.DEV && (
								<TanStackDevtools
									config={{ position: "bottom-right" }}
									plugins={[
										{
											name: "Tanstack Router",
											render: <TanStackRouterDevtoolsPanel />,
										},
									]}
								/>
							)}
							<Toaster position="bottom-center" />
							<Scripts />
						</TooltipProvider>
					</MotionConfig>
				</LazyMotion>
			</body>
		</html>
	);
}
