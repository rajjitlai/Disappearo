'use client';

export default function TermsPage() {
    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Terms of Service</h1>
                    <p className="text-lg text-[var(--foreground)] max-w-2xl mx-auto">
                        Please read these terms carefully before using Disappearo. By using our service, you agree to these terms.
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Acceptance of Terms</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        By accessing or using Disappearo, you agree to be bound by these Terms of Service. If you disagree
                        with any part of these terms, you may not access the service. These terms apply to all visitors,
                        users, and others who access or use the service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Description of Service</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        Disappearo is an ephemeral, privacy-first chat platform that provides temporary messaging services.
                        Our service includes real-time chat, image sharing, content moderation, and export functionality.
                        All features are designed to promote temporary, meaningful connections without permanent digital records.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">User Accounts & Authentication</h2>
                    <div className="space-y-3">
                        <p className="text-[var(--foreground)]">
                            To use Disappearo, you must:
                        </p>
                        <ul className="space-y-2 text-[var(--muted-foreground)]">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Provide a valid email address for authentication</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Complete magic-link authentication process</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Maintain the security of your authentication tokens</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Not share your account credentials with others</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Acceptable Use Policy</h2>
                    <div className="space-y-4">
                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">You agree NOT to:</h3>
                            <ul className="space-y-1 text-[var(--foreground)] text-sm">
                                <li>• Share illegal, harmful, or inappropriate content</li>
                                <li>• Harass, bully, or threaten other users</li>
                                <li>• Share spam, malware, or phishing content</li>
                                <li>• Attempt to circumvent content moderation systems</li>
                                <li>• Use the service for commercial purposes without permission</li>
                                <li>• Violate any applicable laws or regulations</li>
                            </ul>
                        </div>

                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">You agree TO:</h3>
                            <ul className="space-y-1 text-[var(--foreground)] text-sm">
                                <li>• Respect other users and their privacy</li>
                                <li>• Use the service for legitimate communication purposes</li>
                                <li>• Report inappropriate content when encountered</li>
                                <li>• Comply with our content moderation policies</li>
                                <li>• Maintain appropriate behavior in all interactions</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Content Moderation & Enforcement</h2>
                    <div className="space-y-3">
                        <p className="text-[var(--foreground)]">
                            Disappearo uses AI-powered content moderation to maintain safe spaces:
                        </p>
                        <ul className="space-y-2 text-[var(--muted-foreground)]">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>All content is automatically scanned for violations</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Strike system: 3 violations result in automatic account suspension</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Banned accounts lose access to all service features</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Appeals may be considered on a case-by-case basis</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Privacy & Data Handling</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        Your privacy is important to us. By using Disappearo, you acknowledge that:
                    </p>
                    <ul className="space-y-2 text-[var(--muted-foreground)] mt-3">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span>Chat messages are ephemeral and not permanently stored</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span>Content moderation may involve AI analysis of your messages</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span>Exports require mutual consent from all participants</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span>Your data is handled according to our Privacy Policy</span>
                        </li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Service Availability & Limitations</h2>
                    <div className="space-y-3">
                        <p className="text-[var(--foreground)]">
                            Disappearo is provided &quot;as is&quot; with the following limitations:
                        </p>
                        <ul className="space-y-2 text-[var(--muted-foreground)]">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Service may experience outages or interruptions</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Chat requests expire after 5 minutes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Messages are not guaranteed to be delivered</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Data loss may occur due to service issues</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Intellectual Property</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        The Disappearo service, including its original content, features, and functionality, is owned by
                        Disappearo and is protected by international copyright, trademark, patent, trade secret, and other
                        intellectual property laws. You retain ownership of content you create, but grant us license to
                        process it for service provision and moderation.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Termination</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        We may terminate or suspend your account immediately, without prior notice, for any reason,
                        including without limitation if you breach the Terms. Upon termination, your right to use the
                        service will cease immediately. We may also terminate accounts that violate our content policies
                        or engage in harmful behavior.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Limitation of Liability</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        In no event shall Disappearo, nor its directors, employees, partners, agents, suppliers, or
                        affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages,
                        including without limitation, loss of profits, data, use, goodwill, or other intangible losses,
                        resulting from your use of the service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Changes to Terms</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        We reserve the right to modify or replace these Terms at any time. If a revision is material,
                        we will try to provide at least 30 days notice prior to any new terms taking effect. What
                        constitutes a material change will be determined at our sole discretion.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Contact Information</h2>
                    <p className="text-[var(--foreground)]">
                        If you have any questions about these Terms of Service, please contact us. We&apos;re committed to
                        transparency and will respond to all inquiries about our terms and policies.
                    </p>
                </section>

                <div className="text-center pt-4">
                    <p className="text-sm text-[var(--muted-foreground)]">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
}


