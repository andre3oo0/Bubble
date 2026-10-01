
# Bubble - Mental Health & Emotional Support Platform

## Setup Instructions

Requires Node.js 20 or newer.

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and add your OpenAI key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

The application will start on http://localhost:5000 (set `PORT` in `.env` to change it).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (API + frontend on one port) |
| `npm run check` | Type-check the whole project |
| `npm run build` | Build the frontend and bundle the server into `dist/` |
| `npm start` | Run the production build from `dist/` |

## Tech Stack
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- State Management: Zustand
- 3D Rendering: Three.js
- AI: OpenAI GPT
