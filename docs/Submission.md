# Disappearo – Hackathon Submission

## Project title

Disappearo – Ephemeral Privacy‑First Chat

## Project description

Disappearo is a privacy‑first, ephemeral chat application where conversations automatically disappear after inactivity. It features magic‑link authentication, real‑time messaging, image sharing with moderation, dual‑approval exports (JSON and TXT), and a strike‑based safety system with temporary auto‑unban. The app is built on Next.js 15 and Appwrite (Auth, Database, Realtime, Storage) with a clean, responsive UI and light/dark theming. Security hardening includes CSP headers, rate‑limited moderation API, and strict data minimization.

Key capabilities:

- Ephemeral chat sessions (auto‑deletion after 5 minutes inactivity)
- Real‑time messaging via Appwrite Realtime
- Magic link auth (passwordless)
- Image upload with AI moderation and pending/approval flow
- Dual‑approval chat export (both must consent)
- Inline message editing (5 minutes, own messages)
- Strike system with auto‑unban after 10 minutes

## Inspiration behind the project

People increasingly need private spaces for short‑lived conversations without permanent traces. Disappearo embraces “privacy by design”: messages vanish by default, exports require mutual consent, and AI moderation helps keep chats safe while avoiding long‑term data retention.

## Tech stack

- Framework: Next.js 15 (App Router), React 19, TypeScript
- UI: Tailwind CSS v4, CSS variables (theming), Next/Image
- Backend (BaaS): Appwrite (Auth, Database, Realtime, Storage)
- AI Moderation: Hugging Face Inference API (toxicity + NSFW)
- Tooling: ESLint 9, React Hot Toast
- Hosting: Appwrite Sites (standalone build)

## Repository link

<https://github.com/rajjitlai/Disappearo>

## Deployed Sites link

<https://disappearo.appwrite.network>

## Credits

- Author: Rajjit Laishram (<https://github.com/rajjitai>)
- Assisted by: ChatGPT and Cursor AI (code optimization and documentation)
- Logo: Designed with Canva
