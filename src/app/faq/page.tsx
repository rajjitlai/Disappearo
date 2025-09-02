'use client';

import { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqData: FAQItem[] = [
    // General Questions
    {
        question: "What is Disappearo?",
        answer: "Disappearo is a privacy-first, ephemeral chat platform that prioritizes user privacy and data security. Messages are designed to be temporary, not permanent records, ensuring your conversations remain private and secure.",
        category: "general"
    },
    {
        question: "How is Disappearo different from other chat apps?",
        answer: "Unlike traditional chat apps that store messages indefinitely, Disappearo uses ephemeral messaging where messages vanish automatically. We also implement AI-powered content moderation and require mutual consent for any data exports.",
        category: "general"
    },
    {
        question: "Is Disappearo free to use?",
        answer: "Yes, Disappearo is currently free to use. We may introduce premium features in the future, but the core messaging functionality will remain free.",
        category: "general"
    },

    // Privacy & Security
    {
        question: "How does Disappearo protect my privacy?",
        answer: "We protect your privacy through ephemeral messaging (messages vanish automatically), AI content moderation, minimal data collection, and user control over data exports. All exports require mutual consent from both participants.",
        category: "privacy"
    },
    {
        question: "Are my messages really deleted?",
        answer: "Yes, messages are automatically deleted when chat sessions end or expire. We do not maintain permanent message logs, ensuring your conversations remain temporary and private.",
        category: "privacy"
    },
    {
        question: "Can someone export our chat without my permission?",
        answer: "No, all exports require mutual consent from both chat participants. This ensures that conversations remain private and cannot be exported without your explicit permission.",
        category: "privacy"
    },
    {
        question: "What data does Disappearo store about me?",
        answer: "We store minimal data: your email for authentication, a unique handle, and strike count for moderation. No personal information beyond what's necessary for functionality is stored.",
        category: "privacy"
    },

    // Technical Questions
    {
        question: "How does the magic-link authentication work?",
        answer: "Magic-link authentication sends you a secure login link via email. Click the link to automatically log in without needing to remember or store passwords. This provides secure access while maintaining your privacy.",
        category: "technical"
    },
    {
        question: "Why do chat requests expire after 5 minutes?",
        answer: "The 5-minute expiry promotes active engagement and ensures that chat requests don't accumulate indefinitely. This helps maintain a clean, active user base and encourages timely responses.",
        category: "technical"
    },
    {
        question: "Can I share images in chats?",
        answer: "Yes, you can share images in chats. Images are stored securely and are subject to the same ephemeral nature as messages - they're automatically removed when chat sessions end.",
        category: "technical"
    },
    {
        question: "What happens if I lose my internet connection?",
        answer: "If you lose connection, messages will be queued and sent when you reconnect. However, if a chat session expires while you're offline, you may need to start a new session.",
        category: "technical"
    },

    // Content Moderation
    {
        question: "How does AI content moderation work?",
        answer: "We use Hugging Face AI models to automatically scan text and images for inappropriate content. This helps maintain safe spaces and ensures all users can enjoy a positive experience.",
        category: "moderation"
    },
    {
        question: "What happens if I violate content policies?",
        answer: "Violations result in strikes. After 3 strikes, your account is automatically suspended. This system helps maintain community standards and ensures Disappearo remains a safe platform.",
        category: "moderation"
    },
    {
        question: "Can I appeal a strike or ban?",
        answer: "Yes, you can appeal strikes or bans by contacting our support team. We review appeals on a case-by-case basis and may reinstate accounts if appropriate.",
        category: "moderation"
    },

    // Account & Billing
    {
        question: "How do I delete my account?",
        answer: "To delete your account, contact our support team. We'll process your request and remove all associated data within 30 days, in accordance with data protection regulations.",
        category: "account"
    },
    {
        question: "Can I change my Disappearo ID?",
        answer: "Currently, Disappearo IDs are auto-generated and cannot be changed. This ensures consistency and prevents confusion in the system.",
        category: "account"
    },
    {
        question: "What if I forget my email address?",
        answer: "If you can't remember the email associated with your account, please contact our support team. We'll help you recover access to your account.",
        category: "account"
    },

    // Troubleshooting
    {
        question: "Why can't I send a message?",
        answer: "This could be due to several reasons: your account may have been suspended, the chat session may have expired, or there might be a technical issue. Check your account status and try starting a new chat.",
        category: "troubleshooting"
    },
    {
        question: "How do I report a bug?",
        answer: "To report a bug, use our contact form and select 'Bug Report' as the subject. Include detailed information about the issue, steps to reproduce it, and any error messages you see.",
        category: "troubleshooting"
    },
    {
        question: "The app is loading slowly. What should I do?",
        answer: "Try refreshing the page, clearing your browser cache, or checking your internet connection. If the issue persists, contact our support team for assistance.",
        category: "troubleshooting"
    }
];

const categories = [
    { id: 'all', name: 'All Questions', count: faqData.length },
    { id: 'general', name: 'General', count: faqData.filter(item => item.category === 'general').length },
    { id: 'privacy', name: 'Privacy & Security', count: faqData.filter(item => item.category === 'privacy').length },
    { id: 'technical', name: 'Technical', count: faqData.filter(item => item.category === 'technical').length },
    { id: 'moderation', name: 'Content Moderation', count: faqData.filter(item => item.category === 'moderation').length },
    { id: 'account', name: 'Account & Billing', count: faqData.filter(item => item.category === 'account').length },
    { id: 'troubleshooting', name: 'Troubleshooting', count: faqData.filter(item => item.category === 'troubleshooting').length }
];

export default function FAQPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const filteredFAQs = selectedCategory === 'all'
        ? faqData
        : faqData.filter(item => item.category === selectedCategory);

    const toggleItem = (index: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedItems(newExpanded);
    };

    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Frequently Asked Questions</h1>
                    <p className="text-lg text-[var(--foreground)] max-w-2xl mx-auto">
                        Find quick answers to common questions about Disappearo. Can&apos;t find what you&apos;re looking for?
                        <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">Contact us</a> for personalized support.
                    </p>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 justify-center">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedCategory === category.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-[var(--card-background)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--muted)]'
                                }`}
                        >
                            {category.name} ({category.count})
                        </button>
                    ))}
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                    {filteredFAQs.map((item, index) => (
                        <div
                            key={index}
                            className="border border-[var(--border)] rounded-lg bg-[var(--card-background)] overflow-hidden"
                        >
                            <button
                                onClick={() => toggleItem(index)}
                                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-[var(--muted)] transition-colors"
                            >
                                <h3 className="font-medium text-[var(--foreground)] pr-4">
                                    {item.question}
                                </h3>
                                <svg
                                    className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${expandedItems.has(index) ? 'rotate-180' : ''
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {expandedItems.has(index) && (
                                <div className="px-6 pb-4 border-t border-[var(--border)]">
                                    <p className="text-[var(--muted-foreground)] pt-4 leading-relaxed">
                                        {item.answer}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Still Have Questions */}
                <div className="text-center space-y-4 pt-8">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Still Have Questions?</h2>
                    <p className="text-[var(--muted-foreground)]">
                        Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="/contact"
                            className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                        >
                            Contact Support
                        </a>
                        <a
                            href="/about"
                            className="border-2 border-[var(--border)] px-6 py-3 rounded-lg font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
