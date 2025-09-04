# Security Policy

## Supported Versions

The hackathon submission targets the current code in `main`. Security updates will be addressed on a best-effort basis during the hackathon period.

## Reporting a Vulnerability

- Please open a confidential issue or email the maintainer linked on the GitHub repo.
- Include reproducible steps, affected endpoints, and any logs/screenshots.
- Do not publicly disclose vulnerabilities before a fix is available.

## Data Protection

- Ephemeral chat: messages are deleted upon session exit or 5 minutes of inactivity.
- Image views use Storage view URLs; no explicit download action provided.
- No long-term message persistence by design.

## Application Security

- Authentication: Appwrite magic link (passwordless).
- Authorization: Client-side gating via cookie + server-side Appwrite rules.
- Moderation: Text and image moderation with strike system and temporary bans.
- Headers: CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy via middleware.

## Coordinated Disclosure

We appreciate responsible disclosure. We will acknowledge reports and work to address critical issues promptly.
