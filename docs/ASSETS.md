# Assets Guide

This guide explains where to place screenshots, GIFs, and how to reference them in documentation.

## Folder Structure

Use one of the following locations:

- `docs/assets/` for documentation-only images
- `public/assets/` for images used in the site (Next.js will serve under `/assets/...`)

Recommended:

```
docs/
  assets/
    screenshots/
    gifs/
public/
  assets/
    marketing/
```

Current assets added:

- `docs/assets/home.png`
- `docs/assets/dashboard.png`
- `docs/assets/chat.png`

## Naming Conventions

- `feature-context-size.ext` (e.g., `chat-export-desktop.png`)
- Use lowercase, hyphen-separated names

## Referencing in Markdown

From README or docs:

```md
![Home](docs/assets/home.png)

![Dashboard](docs/assets/dashboard.png)

![Chat](docs/assets/chat.png)
```

If placed in `public/assets`, reference with absolute path:

```md
![Logo](./public/assets/marketing/logo.png)
```

## Tips

- Prefer PNG for UI screenshots, GIF/MP4/WebM for flows
- Keep total repo size reasonable; optimize images when possible
- For large demos, link to an external video (e.g., unlisted on YouTube)
