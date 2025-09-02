# Disappearo

Ephemeral, privacy-first chat built on Next.js 15, React 19, Tailwind v4, and Appwrite.

## Features

- Magic link auth (Appwrite)
- Ephemeral chat sessions (5 minutes inactivity expiry)
- Dual-approval exports (JSON + TXT)
- Inline editing (5 minutes, own messages)
- Image messages (Appwrite Storage) without download exposure
- Realtime (Appwrite Realtime)
- AI moderation (Hugging Face) with strikes & auto-ban

## Getting Started

1. Clone and install

```bash
npm install
```

2. Configure env (`.env.local`)

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT=
NEXT_PUBLIC_APPWRITE_DATABASE_ID=
NEXT_PUBLIC_APPWRITE_PROFILE_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_CHATREQUESTS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_CHATSESSIONS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_BUCKET_ID=
HUGGINGFACE_API_TOKEN=
```

3. Run dev

```bash
npm run dev
```

## Security & Privacy

- Messages are short-lived and deleted on expiry or session exit.
- Image views use Storage view URLs; no explicit download action is provided.
- Exports require consent from both participants.
- Moderation blocks unsafe content; users are banned after 3 strikes.

## Theming

- Light/Dark theme with a toggle (header). Uses CSS variables and Tailwind.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
