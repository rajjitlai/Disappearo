'use client';

import { useState } from 'react';
import { databases, ids } from '@/app/lib/appwrite';
import { ID } from 'appwrite';
import toast from 'react-hot-toast';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await databases.createDocument(ids.db, 'contact_queries', ID.unique(), {
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            toast.success('Your message has been sent successfully!');
            setFormData({ email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Contact Us</h1>
                    <p className="text-lg text-[var(--foreground)] max-w-2xl mx-auto mb-6">
                        Have questions about Disappearo? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Contact Form */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-[var(--foreground)]">Send us a Message</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                                    placeholder="Enter your email address"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                    Subject *
                                </label>
                                <select
                                    id="subject"
                                    name="subject"
                                    required
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--input-background)] text-[var(--input-foreground)] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                                >
                                    <option value="">Select a subject</option>
                                    <option value="general">General Inquiry</option>
                                    <option value="technical">Technical Support</option>
                                    <option value="billing">Billing & Account</option>
                                    <option value="privacy">Privacy & Security</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="bug">Bug Report</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    rows={6}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
                                    placeholder="Describe your inquiry or issue in detail..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 dark:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-[var(--foreground)]">Get in Touch</h2>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-[var(--foreground)]">Email Support</h3>
                                    <p className="text-[var(--muted-foreground)] text-sm">rajjitlai@mail.com</p>
                                    <p className="text-[var(--muted-foreground)] text-xs mt-1">We typically respond within 24 hours</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-green-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-[var(--foreground)]">Response Time</h3>
                                    <p className="text-[var(--muted-foreground)] text-sm">24-48 hours</p>
                                    <p className="text-[var(--muted-foreground)] text-xs mt-1">For urgent issues, please use the form above</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-[var(--foreground)]">Priority Support</h3>
                                    <p className="text-[var(--muted-foreground)] text-sm">Available for premium users</p>
                                    <p className="text-[var(--muted-foreground)] text-xs mt-1">Faster response times and dedicated support</p>
                                </div>
                            </div>
                        </div>

                        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-background)]">
                            <h3 className="font-medium text-[var(--foreground)] mb-2">Before Contacting Us</h3>
                            <ul className="space-y-1 text-[var(--muted-foreground)] text-sm">
                                <li>• Check our <a href="/faq" className="text-blue-600 dark:text-blue-400 hover:underline">FAQ page</a> for quick answers</li>
                                <li>• Review our <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a> and <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a></li>
                                <li>• Ensure you&apos;ve provided all necessary details</li>
                                <li>• Include any relevant error messages or screenshots</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
