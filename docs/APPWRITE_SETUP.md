# Appwrite Setup (Collections, Bucket, Env)

This project uses Appwrite for auth, database, realtime and storage. Below is the exact setup that matches the current codebase.

## 1) Environment variables (.env.local)

```bash
# Appwrite project
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://<your-endpoint>
NEXT_PUBLIC_APPWRITE_PROJECT=<your-project-id>

# Database + collections
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<your-db-id>
NEXT_PUBLIC_APPWRITE_PROFILE_COLLECTION_ID=<profiles-collection-id>
NEXT_PUBLIC_APPWRITE_CHATREQUESTS_COLLECTION_ID=<chatRequests-collection-id>
NEXT_PUBLIC_APPWRITE_CHATSESSIONS_COLLECTION_ID=<chatSessions-collection-id>
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=<messages-collection-id>
NEXT_PUBLIC_APPWRITE_BAD_WORDS_COLLECTION_ID=<bad_words-collection-id>
NEXT_PUBLIC_APPWRITE_CONTACT_COLLECTION_ID=<contact-collection-id>

# Storage
NEXT_PUBLIC_APPWRITE_BUCKET_ID=<images-bucket-id>
```

All of the above are referenced via `ids.<name>` in `src/app/lib/appwrite.ts`.

## 2) Collections and attributes

Create the following collections under your database. Permissions can be set to: Read = authenticated users; Write = authenticated users (tighten as needed). Ensure Realtime is enabled on the project.

### a) profiles (id: `profiles`)

- userId (string, required)
- handle (string, required)
- strikes (integer, min 0, max 3)
- banned (boolean)
- bannedAt (string)
- lastStrikeAt (string)

Recommended indexes:

- userId (asc)

### b) chatRequests (id: `chatrequests`)

- fromId (string, required)
- toId (string, required)
- status (enum: `pending`, `accepted`, `declined`, `expired`, `cancel`)
- expiresAt (string, required, ISO datetime)

Recommended indexes:

- toId (asc)
- fromId (asc)
- status (asc)

Notes:

- We use `cancel` (not `cancelled`) to match Appwrite attribute enum.
- Realtime channel used: `databases.<db>.collections.<chatrequests>.documents`.

### c) chatSessions (id: `chatsessions`)

- participants (string[], required) — 2 handles

We create a session with id equal to the accepted request id.

### d) messages (id: `messages`)

- sessionId (string, required)
- text (string, required)
- sender (string, required)
- expiresAt (string, optional)

Recommended indexes:

- sessionId (asc)
- $createdAt (desc) for efficient history reads

### e) bad_words (id: `bad_words`)

- word (string, required, lowercased)
- category (enum: `profanity`, `hate_speech`, `threats`, `spam`, `general`)
- createdAt (string, required)

Indexes:

- word (asc)
- category (asc)
- createdAt (desc)

### f) contact (id: `contact`)

- email (string, required)
- subject (string, required)
- message (string, required)

Used by the Contact page to store inbound queries.

## 3) Storage bucket

Create a bucket for images (id referenced by `NEXT_PUBLIC_APPWRITE_BUCKET_ID`).

Permissions:

- Read: Users
- Write: User(owner) (the app sets write permission to the uploader)

## 4) Realtime used by the app

- chatRequests: subscribe to all request document events
  - Accept → open chat `/chat/<requestId>`
  - Decline/Cancel → show themed toast
- messages: subscribe to session messages
- chatSessions: subscribe to session lifecycle (delete → redirect)

## 5) Status model the UI expects

- chatRequests.status is one of: `pending`, `accepted`, `declined`, `expired`, `cancel`
- App writes `cancel` when sender cancels an outgoing request

## 6) Theming notes (React Hot Toast)

Toaster is themed via CSS variables in `src/app/layout.tsx`:

- background: `var(--card-background)`
- color: `var(--foreground)`
- border: `1px solid var(--border)`

## 7) Optional: Bad words import

You can seed `bad_words` using `bad-words.txt`. Example API import:

```javascript
await databases.createDocument(ids.db, ids.bad_words, ID.unique(), {
  word: word.toLowerCase().trim(),
  category: 'profanity',
  createdAt: new Date().toISOString()
});
```

## 8) Quick validation checklist

- All env vars present and match collection/bucket IDs
- `chatRequests.status` enum includes `cancel`
- Indexes created for `profiles.userId`, `chatRequests.{toId,fromId,status}`, `messages.sessionId`
- Storage bucket exists and has Users read permission
- Realtime enabled; rules permit authenticated users to read/write their documents
