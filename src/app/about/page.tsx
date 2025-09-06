'use client';

export default function AboutPage() {
    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">About Disappearo</h1>
                    <p className="text-lg text-[var(--foreground)] max-w-2xl mx-auto">
                        A privacy-first, ephemeral chat platform built for safety, trust, and digital well-being.
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Our Mission</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        We believe sensitive conversations deserve short lifespans, clear consent, and user control.
                        In a world where digital footprints last forever, Disappearo provides a safe space for
                        temporary, meaningful connections without the burden of permanent records.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">How It Works</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <h3 className="font-medium text-[var(--foreground)]">1. Secure Authentication</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">
                                Magic-link login ensures secure access without storing passwords
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium text-[var(--foreground)]">2. Ephemeral Sessions</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">
                                Chat requests expire in 5 minutes, promoting active engagement
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium text-[var(--foreground)]">3. Privacy-First Design</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">
                                Messages are designed to be temporary, not permanent records
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium text-[var(--foreground)]">4. AI-Powered Safety</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">
                                Content moderation using OpenModerator AI with strike system
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Key Features</h2>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">Magic-link authentication for secure access</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">5-minute chat request expiry system</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">Real-time messaging with instant delivery</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">Image sharing with privacy protection</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">Dual-approval export system (JSON/TXT)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">AI content moderation with strike system</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">Automatic user banning after 3 strikes</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span className="text-[var(--foreground)]">Light and dark theme support</span>
                        </li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Privacy & Security</h2>
                    <p className="text-[var(--foreground)] leading-relaxed">
                        Disappearo is built with privacy at its core. We use Appwrite for secure backend services,
                        implement content moderation to maintain safe spaces, and provide users with control over
                        their data through the export system. All exports require mutual consent, ensuring that
                        conversations remain private between participants.
                    </p>
                </section>

                <section className="text-center space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Ready to Start?</h2>
                    <p className="text-[var(--muted-foreground)]">
                        Experience the future of ephemeral communication
                    </p>
                    <a
                        href="/login"
                        className="inline-block bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                    >
                        Get Started
                    </a>
                </section>
            </div>
        </div>
    );
}


