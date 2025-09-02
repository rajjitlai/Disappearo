'use client';

export default function PrivacyPage() {
    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Privacy Policy</h1>
                    <p className="text-lg text-[var(--foreground)] max-w-2xl mx-auto">
                        Your privacy is fundamental to Disappearo. We believe in transparency about how we handle your data.
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Our Privacy Philosophy</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        Disappearo is built on the principle of ephemeral communication. We minimize data retention,
                        ensure user control over their information, and maintain transparency about our data practices.
                        Your conversations are designed to be temporary, not permanent records.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Data Collection & Storage</h2>
                    <div className="space-y-4">
                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">Authentication Data</h3>
                            <p className="text-[var(--foreground)] text-sm">
                                We use Appwrite for secure authentication. We do not store passwords - only magic link tokens
                                for secure login. Your email address is used solely for authentication purposes.
                            </p>
                        </div>

                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">Profile Information</h3>
                            <p className="text-[var(--foreground)] text-sm">
                                We store minimal profile data: a unique handle (auto-generated), user ID, and strike count
                                for moderation purposes. No personal information beyond what&apos;s necessary for functionality.
                            </p>
                        </div>

                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">Chat Messages</h3>
                            <p className="text-[var(--foreground)] text-sm">
                                Messages exist only during active chat sessions. They are automatically deleted when sessions
                                end or expire. We do not maintain permanent message logs.
                            </p>
                        </div>

                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">Image Content</h3>
                            <p className="text-[var(--foreground)] text-sm">
                                Images are stored in Appwrite Storage with access controlled by your project&apos;s security rules.
                                Images are not permanently retained and are subject to the same ephemeral nature as messages.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Content Moderation & AI</h2>
                    <div className="space-y-3">
                        <p className="text-[var(--foreground)]">
                            To maintain safe spaces, we use AI-powered content moderation:
                        </p>
                        <ul className="space-y-2 text-[var(--muted-foreground)]">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Text content is analyzed using Hugging Face AI models for inappropriate content</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Images are scanned for content violations using AI detection</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Strike system: 3 violations result in automatic account suspension</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Moderation data is not stored permanently - only strike counts</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Data Export & Control</h2>
                    <div className="space-y-3">
                        <p className="text-[var(--foreground)]">
                            You have control over your data through our export system:
                        </p>
                        <ul className="space-y-2 text-[var(--muted-foreground)]">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Exports require mutual consent from both chat participants</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Available formats: JSON and TXT</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>Export data includes only the conversation content, not metadata</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span>You can request deletion of your profile data at any time</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Data Retention</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        <strong>Chat Messages:</strong> Deleted immediately when sessions end or expire (5-minute limit)<br />
                        <strong>Images:</strong> Removed when chat sessions end<br />
                        <strong>User Profiles:</strong> Retained until account deletion<br />
                        <strong>Moderation Data:</strong> Only strike counts are retained for safety purposes
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Third-Party Services</h2>
                    <div className="space-y-3">
                        <p className="text-[var(--foreground)]">
                            We use the following third-party services:
                        </p>
                        <ul className="space-y-2 text-[var(--muted-foreground)]">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span><strong>Appwrite:</strong> Backend services, authentication, and data storage</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                                <span><strong>Hugging Face:</strong> AI content moderation (text and image analysis)</span>
                            </li>
                        </ul>
                        <p className="text-[var(--muted-foreground)] text-sm">
                            Each service has their own privacy policies, which we recommend reviewing.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Your Rights</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        You have the right to access, modify, or delete your personal data. You can also request
                        information about what data we hold about you. Contact us if you need assistance with
                        any privacy-related requests.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Contact Us</h2>
                    <p className="text-[var(--foreground)]">
                        If you have questions about this privacy policy or our data practices, please reach out to us.
                        We&apos;re committed to transparency and will respond to all privacy-related inquiries.
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


