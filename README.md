# LuxVision AI — Luxury Real Estate Image Generator

Generate stunning, magazine-quality AI images of any property address in seconds.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
```
Then open `.env.local` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-...
```
Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

### 3. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel (one command)

```bash
npx vercel
```
When prompted, add `OPENAI_API_KEY` as an environment variable in the Vercel dashboard:
**Project → Settings → Environment Variables**

Or via CLI:
```bash
vercel env add OPENAI_API_KEY
```

---

## Project Structure

```
luxury-real-estate-ai/
├── app/
│   ├── page.tsx              # Main UI — address input, style picker, image display
│   ├── layout.tsx            # Root HTML shell + metadata
│   ├── globals.css           # Tailwind base + luxury dark theme
│   └── api/
│       └── generate/
│           └── route.ts      # POST /api/generate — calls OpenAI, returns base64
├── lib/
│   └── prompts.ts            # Style configs + buildPrompt() function
├── .env.local.example        # Copy to .env.local and add your key
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## API

**`POST /api/generate`**

Request body:
```json
{
  "address": "1600 Mulholland Drive, Los Angeles, CA",
  "style": "aerial"
}
```

Available styles: `aerial`, `luxury-modern`, `sunset`, `cinematic`, `night-luxury`, `bright-clean`

Response:
```json
{
  "imageBase64": "data:image/png;base64,...",
  "prompt": "The full prompt sent to OpenAI"
}
```

---

## Notes

- Images are generated using `gpt-image-1` (OpenAI's latest image model)
- Returned as base64 — no URL expiry, works offline after generation
- Last 3 generated images are stored in React state (resets on page refresh)
- No database required — stateless MVP
