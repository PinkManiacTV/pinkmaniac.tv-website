# Wel bekennen, he!

Single-player card game by PinkManiac Studio. Play against Yuki, Max and Moppie.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4

## Run

```bash
npm install
npm run dev
```

Open the local URL from Vite (usually `http://localhost:5173`).

## Deploy (Netlify / static site)

```bash
npm run build
```

That writes the playable site to `app/wel-bekennen/`. The PM APP tile links to `wel-bekennen/`.  
Upload that folder with the rest of the site. Do **not** rely on `hellen/dist/` (gitignored) and skip uploading `hellen/node_modules/`.

## Rules (short)

- Hearts are always trump
- Must follow suit when possible
- Rounds: 1 → max → max (twice) → back to 1
- Score: 1 point per trick won, +10 if prediction exact
