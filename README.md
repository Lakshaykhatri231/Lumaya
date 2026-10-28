# Lumaya — AI Companion for Mental Clarity & Emotional Growth

Lumaya is a full-stack AI companion app: a chat-based emotional support experience backed by retrieval-augmented AI, journaling, and a set of guided self-reflection tools, wrapped in a 3D animated avatar.

> Internally this project is still named `wallet-monitor` in `package.json` — it started life as a crypto wallet tracker and was pivoted into Lumaya. The name hasn't been updated yet.

## Demo

https://github.com/user-attachments/assets/ca1663ec-ca27-4c5b-90e9-d77a68fd5429

## Features

- **AI chat companion** — conversational support powered by Google Gemini, grounded with a Pinecone vector store for context-aware responses
- **3D avatar** — an animated VRM avatar (Three.js + `@pixiv/three-vrm`) that accompanies the chat experience
- **Journal** — private journaling with entries tied to the user's account
- **Guided tools** — Dream Interpreter, Life Prediction, Relationship Coaching, and a Mental Health Plan generator
- **Auth & accounts** — email/password auth via Supabase, protected routes, user dashboard
- **Payments** — subscription checkout via Paddle
- **Transactional email** — via Resend
- **Sessions & caching** — Express sessions backed by Redis

## Tech stack

**Frontend** — React 18, Vite, React Router, Tailwind CSS, Radix UI primitives, Framer Motion, Three.js/VRM, Supabase JS client

**Backend** — Node.js, Express, Redis (`connect-redis` sessions), Pinecone (vector search), Google Generative AI SDK, Paddle Node SDK, Resend

**Data** — Supabase (Postgres + Auth), with SQL migrations in [`supabase/migrations`](./supabase/migrations)

## Project structure

```
AI/
├── frontend/           # React + Vite web app
│   ├── src/
│   │   ├── components/ # Pages & UI (Chat, Journal, Dashboard, Dream Interpreter, ...)
│   │   ├── services/    # API clients
│   │   ├── hooks/, context/, utils/
│   │   └── App.jsx
│   └── public/
├── backend/            # Express API
│   └── src/
│       ├── routes/      # /api/chatbot, /api/journal, /api/emails, /api/auth, /api/webhooks
│       ├── services/
│       ├── middlewares/
│       └── config/
└── supabase/
    └── migrations/     # Database schema history
```

## Getting started

### Prerequisites

- Node.js 18+
- A Redis instance (local or hosted, e.g. Upstash)
- Accounts/API keys for: Supabase, Google Gemini, Pinecone, Paddle, Resend

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment variables

Create `frontend/.env.local`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
VITE_PADDLE_CLIENT_TOKEN=
VITE_API_BASE_URL=http://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173
VITE_REDIRECT_URL=http://localhost:5173
```

Create `backend/.env`:

```
PORT=3000
NODE_ENV=development
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
GEMINI_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX2=
HUGGINGFACE_API_KEY=
HUGGINGFACE_API_KEY1=
PADDLE_API_KEY=
RESEND_API_KEY=
SESSION_SECRET=
WEBHOOK_SECRET_KEY=
FRONTEND_URL=http://localhost:5173
```

> Note: both `.env.local` and `.env` are gitignored — never commit real keys. Rotate any keys that may have been exposed previously.

### 3. Run it

```bash
# backend (Express API on :3000)
cd backend && npm run dev     # auto-restarts on file changes (node --watch)
# or: npm start               # plain node, no watch

# frontend (Vite dev server on :5173)
cd frontend && npm run dev
```

## Deployment (Render)

This repo includes a [`render.yaml`](./render.yaml) Blueprint that provisions two services:

- **`lumaya-backend`** — Node web service, root `backend/`, build `npm install`, start `npm start`
- **`lumaya-frontend`** — static site, root `frontend/`, build `npm install && npm run build`, publish `dist/`, with SPA rewrite to `index.html`

To deploy:

1. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint** and point it at this repo. Render will read `render.yaml` and create both services.
2. Fill in the env vars marked `sync: false` in the dashboard (Supabase, Gemini, Pinecone, Paddle, Resend keys, etc.) — Render never reads secret values from the repo.
3. Add a Redis instance (Render's Key Value service, or an external one like Upstash) and set `REDIS_URL` on the backend.
4. Once both services are live, set `VITE_API_BASE_URL` on the frontend to the backend's `https://lumaya-backend.onrender.com`-style URL, and `FRONTEND_URL` on the backend to the frontend's URL (needed for CORS) — then redeploy.

If you already have live services under different names (this product has previously been deployed on Render), either reuse those exact names when applying the Blueprint, or update `FRONTEND_URL`/CORS in `backend/src/app.js` and `VITE_API_BASE_URL` in the frontend env to match your real URLs — this Blueprint intentionally doesn't touch any existing deployment.

## Related projects

- [`frontend-ai`](https://github.com/anabansal/frontend-ai) — the standalone, further-rebranded web frontend for Lumaya
- [`lumaya`](https://github.com/anabansal/lumaya) — the native Expo/React Native mobile app for Lumaya
- [`xrypttSaaS`](https://github.com/anabansal/xrypttSaaS) — the original crypto wallet-monitoring product this codebase was forked from
