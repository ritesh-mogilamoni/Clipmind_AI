# ClipMind AI - Frontend

This directory contains the **Next.js 15 (App Router)** frontend application for ClipMind AI, built with React 19 and styled with Tailwind CSS v4 featuring the Crystal Glass & Frosted Obsidian design system.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The application will run at `http://localhost:3000`.

### Build & Run for Production

```bash
# Build the optimized production application
npm run build

# Start the Next.js production server
npm run start
```

---

## Route Architecture (App Router)

- **Public Landing Page**: `/` (`src/app/page.jsx`)
- **Authentication**:
  - Sign In: `/login` (`src/app/login/page.jsx`)
  - Register: `/signup` (`src/app/signup/page.jsx`)
- **Intelligence Studio Dashboard**: `/dashboard` (`src/app/dashboard/page.jsx`) featuring video uploads, AI processing triggers, interactive timestamp seeking, transcript editor, key moments navigator, and analytics.
