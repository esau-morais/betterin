import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPageLayout } from "#/components/legal/LegalPageLayout";

export const Route = createFileRoute("/terms")({
	component: TermsOfService,
	head: () => ({
		meta: [
			{ title: "Terms of Service — Better In" },
			{
				name: "description",
				content:
					"Terms governing your use of Better In, a privacy-first social network.",
			},
		],
	}),
});

function Dash() {
	return (
		<span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
			–
		</span>
	);
}

function TermsOfService() {
	return (
		<LegalPageLayout
			category="Legal"
			title="Terms of Service"
			lastUpdated="March 24, 2026"
		>
			<section>
				<p>
					These terms govern your use of Better In. By creating an account, you
					agree to these terms. Better In is a social networking platform built
					on principles of privacy, transparency, and respect for your time.
				</p>
			</section>

			{/* 1. Eligibility */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					1. Eligibility
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							You must be at least 13 years old to use Better In. Additional
							regional age restrictions apply — see Section 7 of our{" "}
							<Link
								to="/privacy"
								className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
							>
								Privacy Policy
							</Link>
							.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							You must provide accurate information when creating your account.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>One account per person.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							In Brazil, users under 16 must have their account linked to a
							parent or legal guardian's account, as required by Lei 15.211/2025
							(Art. 24).
						</span>
					</li>
				</ul>
			</section>

			{/* 2. Your Account */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					2. Your Account
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							You are responsible for maintaining the security of your account
							credentials.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>You must use a valid email address.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							You may delete your account at any time via Settings &gt; Account.
							Deletion is permanent and cascade-deletes all associated data.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							We may suspend or terminate accounts that violate these terms.
						</span>
					</li>
				</ul>
			</section>

			{/* 3. Content You Create */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					3. Content You Create
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								You retain ownership
							</strong>{" "}
							of all content you post on Better In.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							You grant Better In a non-exclusive, worldwide license to display,
							distribute, and store your content for the purpose of operating
							the service. This license terminates when you delete the content
							or your account.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							You are responsible for the content you post. Do not post content
							that is illegal, harassing, misleading, defamatory, or infringing
							on others' rights.
						</span>
					</li>
				</ul>
			</section>

			{/* 4. Community Integrity */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					4. Community Integrity
				</h2>
				<p className="mb-4">
					Better In is built around honest representation. The following
					standards reflect that commitment:
				</p>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Experience verification.
							</strong>{" "}
							Other users may dispute experience claims on your profile.
							Disputed items are flagged for review, not automatically removed.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								Salary transparency.
							</strong>{" "}
							Job posts require salary ranges. Deliberately misleading salary
							ranges are a violation of these terms.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								No engagement bait.
							</strong>{" "}
							Content designed purely to maximize engagement — "like if you
							agree," rage bait, misleading headlines — may be deprioritized or
							removed.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							<strong className="font-medium text-foreground">
								No dark patterns.
							</strong>{" "}
							We do not use them, and neither should you. Misleading calls to
							action within your content are a violation.
						</span>
					</li>
				</ul>
			</section>

			{/* 5. Prohibited Conduct */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					5. Prohibited Conduct
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>Spam, bulk unsolicited messages, or automated posting.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Impersonation or misrepresentation of your identity or
							credentials.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>Scraping, crawling, or automated data collection.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>Harassment, hate speech, threats, or doxxing.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>Posting malware, phishing links, or deceptive content.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Circumventing age restrictions or regional compliance measures.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Creating accounts for individuals below the applicable minimum
							age.
						</span>
					</li>
				</ul>
			</section>

			{/* 6. Jobs & Applications */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					6. Jobs & Applications
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							Job posters must include accurate salary ranges. Posts submitted
							without salary information are rejected.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>Job posts expire after 30 days by default.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Application status tracking (applied, viewed, rejected, accepted)
							is designed to be honest — we do not permit silent rejection or
							indefinite "under review" states.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Better In is not an employer and does not mediate hiring decisions
							or disputes.
						</span>
					</li>
				</ul>
			</section>

			{/* 7. Messaging */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					7. Messaging
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							Messaging is opt-in. Conversations require a mutual connection.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>Read receipts are configurable and off by default.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>Message content may be reported for moderation.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							We do not scan message content for advertising or profiling
							purposes.
						</span>
					</li>
				</ul>
			</section>

			{/* 8. AI/ML Features */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					8. AI/ML Features
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							AI-powered features (feed personalization, content moderation, job
							matching) require explicit opt-in consent via Settings &gt; AI.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>You may withdraw consent at any time.</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Opting out does not restrict your access to core features.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							We will clearly label AI-generated or AI-influenced content and
							recommendations where applicable.
						</span>
					</li>
				</ul>
			</section>

			{/* 9. Intellectual Property */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					9. Intellectual Property
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							Better In's name, logo, and design are our intellectual property.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							Open-source components are licensed under their respective
							licenses.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							You may not use our branding to imply endorsement without written
							permission.
						</span>
					</li>
				</ul>
			</section>

			{/* 10. Availability & Disclaimers */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					10. Availability & Disclaimers
				</h2>
				<ul className="space-y-2">
					<li className="flex gap-3">
						<Dash />
						<span>
							The service is provided "as is" without warranties of any kind.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							We strive for reliability but do not guarantee uninterrupted
							availability.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							We are not responsible for third-party content or services linked
							from the platform.
						</span>
					</li>
					<li className="flex gap-3">
						<Dash />
						<span>
							We may modify or discontinue features with reasonable notice.
						</span>
					</li>
				</ul>
			</section>

			{/* 11. Limitation of Liability */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					11. Limitation of Liability
				</h2>
				<p>
					To the maximum extent permitted by applicable law, Better In's total
					liability to you for any claims arising from or related to your use of
					the service is limited to the amount you have paid us in the 12 months
					preceding the claim. For free users, this amount is zero.
				</p>
			</section>

			{/* 12. Governing Law */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					12. Governing Law
				</h2>
				<p>
					The governing law and jurisdiction for these terms will be specified
					upon incorporation. Until then, disputes will be resolved in good
					faith between the parties.
				</p>
			</section>

			{/* 13. Changes */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					13. Changes to These Terms
				</h2>
				<p>
					We will update the "Last updated" date at the top of this page when
					these terms change. Material changes will be communicated via an
					in-app notification at least 30 days in advance. Continued use of
					Better In after the effective date constitutes acceptance of the
					updated terms.
				</p>
			</section>

			{/* 14. Contact */}
			<section>
				<h2 className="mb-4 text-base font-semibold text-foreground">
					14. Contact
				</h2>
				<p>
					For questions about these terms, contact us at{" "}
					<a
						href="mailto:legal@betterin.app"
						className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
					>
						legal@betterin.app
					</a>
					.
				</p>
				<p className="mt-4">
					See also our{" "}
					<Link
						to="/privacy"
						className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
					>
						Privacy Policy
					</Link>
					.
				</p>
			</section>
		</LegalPageLayout>
	);
}
