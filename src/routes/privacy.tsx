import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPageLayout } from "#/components/legal/LegalPageLayout";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPolicy,
	head: () => ({
		meta: [
			{ title: "Privacy Policy — Better In" },
			{
				name: "description",
				content:
					"How Better In collects, uses, and protects your data. Privacy-first by design.",
			},
		],
	}),
});

function ScopeTag({ children }: { children: string }) {
	return <span className="font-mono text-xs text-primary">{children}</span>;
}

function Dash() {
	return (
		<span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
			–
		</span>
	);
}

function PrivacyPolicy() {
	return (
		<LegalPageLayout
			category="Legal"
			title="Privacy Policy"
			lastUpdated="March 24, 2026"
		>
			<section>
				<p>
					Better In ("we", "our", "us") is a privacy-first social network. This
					policy describes what data we collect, why, how it is stored, and your
					rights over it. We designed Better In to collect only what is
					necessary and to give you meaningful control over the rest.
				</p>
				<p className="mt-4">
					We have no advertising. We do not sell your data. These are not
					aspirations — they are architectural decisions.
				</p>
			</section>

			{/* 1. Data We Collect */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					1. Data We Collect
				</h2>

				<div className="space-y-8">
					{/* Identity & Auth */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Identity & Authentication — <ScopeTag>required</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Email and display name.
									</strong>{" "}
									Used to create your account and identify you to other users.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										OAuth tokens.
									</strong>{" "}
									If you sign in with Google, GitHub, or LinkedIn, we store
									access and refresh tokens to maintain your linked account. We
									request only the scopes necessary for authentication.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Session data.
									</strong>{" "}
									IP address and browser user agent are recorded when a session
									is created. Sessions expire after 7 days and are refreshed on
									activity.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										One-time passwords.
									</strong>{" "}
									6-digit codes sent to your email for passwordless sign-in.
									Codes expire after 5 minutes and are deleted upon use or
									expiry.
								</span>
							</li>
						</ul>
					</div>

					{/* Profile */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Profile Information — <ScopeTag>voluntary</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Professional details.
									</strong>{" "}
									Handle, headline, bio, website, avatar, and cover photo. You
									control what you fill in and what remains empty.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Career history.
									</strong>{" "}
									Experience, education, skills, certifications, projects,
									volunteering, honors, and languages. All fields are optional.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Location.
									</strong>{" "}
									A text location you enter, plus latitude and longitude
									coordinates resolved via the Komoot Photon geocoding service
									(open-source, no user identifiers transmitted). Used for
									display and job location matching.
								</span>
							</li>
						</ul>
					</div>

					{/* Social Graph */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Social Graph — <ScopeTag>user-initiated</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Connections.
									</strong>{" "}
									Mutual connections with status tracking (pending, accepted, or
									blocked). You control who you connect with.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Follows.
									</strong>{" "}
									One-way follows that do not require the other person's
									approval.
								</span>
							</li>
						</ul>
					</div>

					{/* Posts & Content */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Posts & Content — <ScopeTag>user-created</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Your posts.
									</strong>{" "}
									Text, media, visibility setting (public, connections-only, or
									private), articles, polls, and events.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Interactions.
									</strong>{" "}
									Comments, reactions (like, insightful, celebrate, support),
									bookmarks, and reposts.
								</span>
							</li>
						</ul>
					</div>

					{/* Feed Behavioral Data */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Feed Behavioral Data — <ScopeTag>automatic</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Feed events.
									</strong>{" "}
									Impressions, clicks, likes, comments, shares, saves, hides,
									and mutes. These signals help us rank your feed and detect
									low-quality content.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Dwell time.
									</strong>{" "}
									How long you view a post, bucketed into ranges (under 2
									seconds, 2–5s, 5–15s, 15–30s, over 30s). We never store raw
									millisecond values — bucketing prevents us from optimizing for
									raw attention time.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Feed position and mode.
									</strong>{" "}
									Which position a post appeared in and whether your feed was in
									ranked or chronological mode. Used for position bias
									correction in ranking.
								</span>
							</li>
						</ul>
						<p className="mt-3">
							This data is used for feed quality, not advertising. We have no
							ads.
						</p>
					</div>

					{/* Messaging */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Messaging — <ScopeTag>opt-in</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									Conversations are created only between mutual connections.
									Message content, media attachments, and read receipts
									(configurable — off by default) are stored.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									We do not scan message content for advertising, profiling, or
									any purpose other than delivery and moderation when reported.
								</span>
							</li>
						</ul>
					</div>

					{/* Jobs */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Jobs — <ScopeTag>user-initiated</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									Job listings you post (salary range is always required —
									transparency by design), saved jobs, and applications you
									submit with their status.
								</span>
							</li>
						</ul>
					</div>

					{/* Notifications & Push */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Notifications & Push — <ScopeTag>configurable</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									Device push tokens (iOS or Android) and per-type notification
									preferences (email and in-app, independently toggled). You
									control which notifications you receive.
								</span>
							</li>
						</ul>
					</div>

					{/* Moderation */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Moderation — <ScopeTag>user-initiated</ScopeTag>
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									Reports you file against content or users, posts you hide, and
									authors you mute. Used to enforce community standards and
									improve your experience.
								</span>
							</li>
						</ul>
					</div>
				</div>
			</section>

			{/* 2. AI/ML and Your Data */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					2. AI/ML and Your Data
				</h2>
				<p>
					All AI and machine learning features require your explicit, granular
					consent. Three independent toggles are available in Settings &gt; AI:
				</p>
				<ul className="mt-4 space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Feed personalization.
							</strong>{" "}
							Allows our models to learn from your interactions to improve feed
							ranking.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Content moderation.
							</strong>{" "}
							Allows your reports and feedback to improve automated content
							quality scoring.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Job matching.
							</strong>{" "}
							Allows our models to use your profile and activity to suggest
							relevant jobs.
						</span>
					</li>
				</ul>
				<p className="mt-4">
					All three default to off. Opting out does not degrade your experience
					— you receive a chronological feed, standard rule-based moderation,
					and manual job search. Your content is never sold to third parties and
					never used to train external models. If you opt in, your data is used
					exclusively within Better In's own ranking and matching systems.
				</p>
			</section>

			{/* 3. How We Use Your Data */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					3. How We Use Your Data
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Account operation.
							</strong>{" "}
							Authentication, session management, password and OTP verification.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Profile display.
							</strong>{" "}
							Showing your profile information to other users according to your
							visibility settings.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Feed ranking.
							</strong>{" "}
							If you opt in to AI feed personalization, behavioral signals
							improve your feed relevance. Otherwise, you receive a
							chronological feed.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Job matching.
							</strong>{" "}
							If you opt in, your skills and experience are matched against job
							requirements. Otherwise, you browse and search jobs manually.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Content quality.
							</strong>{" "}
							Posts receive a quality score to reduce low-effort and misleading
							content. If you opt in to content moderation AI, your feedback
							improves this system.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Analytics.
							</strong>{" "}
							Post impression counts and viewer geography (city-level). You can
							opt out of sharing your location in others' analytics via Settings
							&gt; Privacy.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Notifications.
							</strong>{" "}
							Delivering connection requests, comments, reactions, job matches,
							and messages per your preferences.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Infrastructure.
							</strong>{" "}
							Error logging, performance monitoring, and abuse prevention.
						</span>
					</li>
				</ul>
			</section>

			{/* 4. Data Sharing */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					4. Data Sharing with Third Parties
				</h2>
				<p className="mb-4 font-medium text-foreground">
					We do not sell your data. We have no advertising.
				</p>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								OAuth providers.
							</strong>{" "}
							Google, GitHub, and LinkedIn receive only the standard OAuth
							authentication handshake. They do not receive your Better In data.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Komoot Photon.
							</strong>{" "}
							An open-source geocoding service. Receives location search queries
							only — no user identifiers, no account data.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Kids Web Services (KWS).
							</strong>{" "}
							Age verification and parental consent platform by Epic Games.
							Receives date of birth and, in Brazil, CPF number for verification
							via Serpro. KWS does not retain personal data after verification.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								AI inference providers.
							</strong>{" "}
							If you opt in to AI features, anonymized data may be transmitted
							to inference providers for processing. Never raw user data, never
							for model training by third parties.
						</span>
					</li>
				</ul>
			</section>

			{/* 5. Data Storage and Security */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					5. Data Storage and Security
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>Data is stored in PostgreSQL with encryption at rest.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Redis is used for caching and real-time features — ephemeral data
							only, no persistent personal data.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>OAuth tokens are stored encrypted in the database.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>All transport is over HTTPS/TLS.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Sessions expire after 7 days. OTP codes expire after 5 minutes.
						</span>
					</li>
				</ul>
			</section>

			{/* 6. Your Rights */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					6. Your Rights
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">Access.</strong>{" "}
							Request a copy of all data we hold about you.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Rectification.
							</strong>{" "}
							Edit your profile, posts, and preferences at any time.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">Erasure.</strong>{" "}
							Delete your account via Settings &gt; Account. All associated data
							is cascade-deleted.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Portability.
							</strong>{" "}
							Export your data (profile, posts, connections) in a
							machine-readable format.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Withdraw consent.
							</strong>{" "}
							Toggle AI/ML consent off at any time in Settings &gt; AI. Toggle
							location sharing off in Settings &gt; Privacy.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Restrict processing.
							</strong>{" "}
							Opt out of specific notification types, hide posts, mute authors.
						</span>
					</li>
				</ul>
				<p className="mt-4">
					For users in the EU/EEA, these rights are exercisable under GDPR
					Articles 15–22. For users in Brazil, under the LGPD (Lei Geral de
					Proteção de Dados, Lei 13.709/2018).
				</p>
			</section>

			{/* 7. Age Restrictions and Regional Compliance */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					7. Age Restrictions and Regional Compliance
				</h2>
				<p className="mb-6">
					Better In complies with regional age-protection laws. We apply
					restrictions proportionally based on the user's region, determined by
					account registration location and IP-based geolocation. Where a user's
					region cannot be determined, we apply the most restrictive applicable
					standard.
				</p>

				<div className="space-y-6">
					{/* Global */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Global Minimum
						</h3>
						<p>
							You must be at least 13 years old to create a Better In account.
						</p>
					</div>

					{/* Brazil */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							Brazil — Lei 15.211/2025, ECA Digital
						</h3>
						<p className="mb-3">
							Brazil's ECA Digital (Estatuto da Criança e do Adolescente
							Digital) requires platforms to protect children (under 12) and
							adolescents (12–17). The law mandates high-privacy defaults,
							compulsive-use prevention, and parental oversight. Better In
							complies as follows:
						</p>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Compulsive-use prevention (Art. 8 IV, Art. 17 § 4 II).
									</strong>{" "}
									Default settings avoid features that artificially extend
									usage. Automatic media playback is disabled, notifications are
									limited, and time-based reward mechanics are not used.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Recommendation controls (Art. 17 § 4 V).
									</strong>{" "}
									Personalized feed ranking is off by default for minors. The
									feed defaults to chronological mode, with personalization
									available only through parental controls.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Geolocation restricted (Art. 17 § 4 VI).
									</strong>{" "}
									Location sharing is disabled by default for minor accounts.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										No behavioral profiling (Art. 22, Art. 26).
									</strong>{" "}
									We do not create behavioral profiles of minors for advertising
									or content targeting.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										No dark patterns (Art. 18 § 2).
									</strong>{" "}
									Interfaces must not compromise user autonomy or
									decision-making. We do not design features that manipulate
									minors into weakening their own protections.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Parental account linking (Art. 24).
									</strong>{" "}
									Accounts for users under 16 must be linked to a parent or
									legal guardian's account.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									<strong className="font-medium text-foreground">
										Age verification (Art. 10–14).
									</strong>{" "}
									Age is self-declared at registration and verified
									progressively via Kids Web Services (KWS), a third-party
									platform by Epic Games. In Brazil, KWS verifies age via CPF
									against the Serpro government database. KWS does not retain
									personal information after verification.
								</span>
							</li>
						</ul>
					</div>

					{/* EU/EEA */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							EU/EEA — GDPR Article 8
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									Users under 16 (or the applicable member state minimum, which
									may be as low as 13) require verifiable parental consent for
									data processing before account activation.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									All AI/ML consent toggles default to off — this is already our
									global default.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									Full data rights (erasure, portability, access) are supported
									as required by GDPR Articles 15–22.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									Legal bases for processing: consent (AI features), legitimate
									interest (core platform functionality), and contract (account
									operation).
								</span>
							</li>
						</ul>
					</div>

					{/* US */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							United States — COPPA (Under 13)
						</h3>
						<p>
							Users under 13 are not permitted to register. We do not knowingly
							collect personal information from children under 13. If we become
							aware that a user is under 13, the account will be terminated and
							all associated data deleted.
						</p>
					</div>

					{/* UK */}
					<div>
						<h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-foreground/70">
							United Kingdom — Age Appropriate Design Code (Under 18)
						</h3>
						<ul className="space-y-2">
							<li className="flex gap-3">
								<Dash />
								<span>
									High privacy by default: geolocation off, profiling off, AI
									consent off, feed defaults to chronological mode.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									No nudge techniques, engagement-maximizing design, or
									reward-based retention mechanics.
								</span>
							</li>
							<li className="flex gap-3">
								<Dash />
								<span>
									Data minimization: we collect only the data necessary to
									provide the service to minor users.
								</span>
							</li>
						</ul>
					</div>
				</div>
			</section>

			{/* 8. Cookies and Local Storage */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					8. Cookies and Local Storage
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Session cookie.
							</strong>{" "}
							An httpOnly, secure cookie used for authentication. Expires after
							7 days.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Theme preference.
							</strong>{" "}
							Stored in localStorage (key:{" "}
							<code className="font-mono text-xs">bi-theme</code>) to remember
							your light or dark mode selection.
						</span>
					</li>
				</ul>
				<p className="mt-4">
					We use no third-party tracking cookies, no analytics cookies, and no
					advertising cookies.
				</p>
			</section>

			{/* 9. Data Retention */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					9. Data Retention
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Active accounts.
							</strong>{" "}
							Data is retained for the lifetime of your account.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Deleted accounts.
							</strong>{" "}
							All data is cascade-deleted from the database upon account
							deletion.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Feed behavioral data.
							</strong>{" "}
							Retained for 90 days for feed quality purposes. If you have opted
							in to AI feed personalization, retained for the lifetime of your
							consent.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								OTP codes.
							</strong>{" "}
							Deleted after 5 minutes or upon successful verification.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">Sessions.</strong>{" "}
							Expired sessions are cleaned up after 7 days.
						</span>
					</li>
				</ul>
			</section>

			{/* 10. Changes */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					10. Changes to This Policy
				</h2>
				<p>
					We will update the "Last updated" date at the top of this page when
					the policy changes. Material changes will be communicated via an
					in-app notification. Continued use of Better In after notification
					constitutes acceptance of the updated policy.
				</p>
			</section>

			{/* 11. Contact */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					11. Contact
				</h2>
				<p>
					For questions about this policy or to exercise your data rights,
					contact us at{" "}
					<a
						href="mailto:privacy@betterin.app"
						className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
					>
						privacy@betterin.app
					</a>
					.
				</p>
				<p className="mt-4">
					See also our{" "}
					<Link
						to="/terms"
						className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
					>
						Terms of Service
					</Link>
					.
				</p>
			</section>
		</LegalPageLayout>
	);
}
