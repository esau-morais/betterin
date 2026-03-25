import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { Session } from "#/lib/auth-client";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
	session: Session | undefined;
	profile:
		| {
				handle: string;
				headline: string | null;
				location: string | null;
				avatarFrame: string | null;
		  }
		| null
		| undefined;
	queryClient: QueryClient;
}

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry(failureCount, error) {
					if (error instanceof Error && error.message === "Unauthorized")
						return false;
					return failureCount < 3;
				},
			},
		},
	});

	const router = createTanStackRouter({
		routeTree,
		context: {
			session: undefined,
			profile: undefined,
			queryClient,
		} satisfies RouterContext,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultPendingMs: 200,
		defaultPendingMinMs: 300,
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
