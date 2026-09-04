# Verified Dating App (working name)

A dating web app where every profile is confirmed by a live selfie check —
AI liveness + face-match, then a human moderator makes the final call.

## Stack

- React + Vite, Tailwind v4, Framer Motion for animation
- Supabase — auth, database, storage, realtime chat
- face-api.js — in-browser liveness + face-match scoring (client-side, no backend ML server needed)

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Run the schema**: open the SQL editor in your Supabase dashboard, paste in
   `supabase/schema.sql`, and run it. This creates all tables + Row Level
   Security policies.
3. **Create two storage buckets**: `profile-photos` and `selfies` (Storage tab
   → New bucket). Keep both private; you'll generate signed URLs or use the
   service role key for the admin review page.
4. **Configure env vars**:
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
   Supabase → Settings → API.
5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```

## What's built vs. what's stubbed

**Built and working:**
- Landing page, full onboarding flow (account → basics → photo → live selfie → review)
- Live camera capture with in-browser liveness check (frame-to-frame movement) and
  face-match scoring against the uploaded profile photo, using face-api.js
- Swipe deck with drag gestures, like/pass animations, match modal
- Chat UI wired to Supabase realtime (subscribes to new messages)
- Admin review dashboard pulling from the `verifications` table
- Full Supabase schema with Row Level Security so users can only see their
  own data and messages within their own matches

**Stubbed / needs wiring for production:**
- `Onboarding.jsx` doesn't yet call `supabase.auth.signUp()` or upload the
  photo/selfie to Storage — the flow works end-to-end in the UI but doesn't
  persist yet. Look for the `// In production:` comments.
- `Discover.jsx` falls back to sample profiles if Supabase has no verified
  users yet, so the UI is demoable standalone. Swipe writes aren't
  persisted — see the comment in `handleSwipe`.
- `Chat.jsx` sends messages to local state only — the Supabase insert is
  commented where it goes.
- Admin route (`/admin`) has no auth gate yet. Before launch, add an
  `is_admin` check (e.g. a boolean column checked via RLS, or a separate
  Supabase Edge Function using the service role key) — don't rely on the
  URL being unlisted.

## Before you launch publicly

Same checklist as any dating product, doubled since this handles biometric-adjacent data:

- **Age gate**: enforced at signup (age >= 18 in the schema), but double-check
  your onboarding copy is clear this is user-declared, not independently verified.
- **Privacy policy + data safety disclosure**: required by both app stores once
  you wrap this — you're collecting photos and (if you add it) location.
- **Selfie retention**: decide how long you keep raw selfie images after
  approval. Shortest defensible retention window is safest — consider
  deleting the raw selfie once approved and keeping only the `verified` flag.
- **Report / block**: not built yet — add a `reports` table and a block list
  before this goes anywhere near real users. Both app stores require this
  for the dating category.
- **face-api.js models**: currently loaded from a public GitHub-hosted URL
  at runtime (see `src/lib/faceVerification.js`). For production, download
  the model weights and serve them from your own `/public/models` folder
  instead, so you're not depending on a third party at load time.

## Next steps

Want the auth + storage wiring done next (actually persisting signups,
photos, swipes, and matches), or the mobile wrap (Capacitor) once this is
tested?
