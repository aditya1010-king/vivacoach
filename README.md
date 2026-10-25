# VivaCoach (AK ONE)

Practise lab viva questions out loud and get examiner-style marks, model answers and a weak-spot list.

**Stack:** React + Vite + TypeScript · Supabase (Google sign-in, Postgres, row-level security, one Edge Function) · Gemini 2.5 Flash-Lite · Cloudflare Pages.
**Running cost:** ₹0 hosting; AI about ₹0.28 per 10-question session.

```
src/                      the web app
  pages/                  Login, Onboarding, Home, LabPage, PracticePage, Account
  components/             Paywall, small UI bits
  lib/                    Supabase client, data loading, speech-to-text
supabase/
  migrations/001_schema.sql   tables + security rules (run once)
  seed/sample_lab.sql         a sample Data Structures lab (18 questions)
  seed/TEMPLATE_your_lab.sql  copy this to add your real lab
  functions/viva/index.ts     server: quotas + AI grading (the only place the AI key lives)
  admin/admin_queries.sql     activate passes, validation-week metrics, AI cost
public/_redirects             makes page refreshes work on Cloudflare Pages
```

---

## Setup (about 1 hour, first time)

### 1. Create the Supabase project
1. Sign up at [supabase.com](https://supabase.com) → **New project**.
2. Region: **South Asia (Mumbai)**. Save the database password somewhere safe.

### 2. Create the database
In the Supabase dashboard → **SQL Editor** → New query:
1. Paste all of `supabase/migrations/001_schema.sql` → **Run**.
2. Paste all of `supabase/seed/sample_lab.sql` → **Run**.

### 3. Turn on Google sign-in
1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen** (External, app name "VivaCoach", your email).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     (copy the exact URL from Supabase → Authentication → Sign In / Providers → Google).
3. Paste the Client ID and Client secret into Supabase → Authentication → Providers → **Google** → Enable.
4. Supabase → Authentication → **URL Configuration**:
   - Site URL: `https://viva.akone.xyz`
   - Redirect URLs: add `https://viva.akone.xyz` and `http://localhost:5173`

Email sign-in links also work out of the box, but Supabase's built-in email is rate-limited (a few per hour). Google sign-in is the main path.

### 4. Run the app on your computer
```bash
npm install
cp .env.example .env      # then fill in the values
npm run dev               # opens http://localhost:5173
```
`.env` values: Supabase → **Project Settings → API** → Project URL and the `anon` public key. Add your UPI ID and WhatsApp number for the paywall.

You can sign in and browse labs now. Practising needs step 5.

### 5. Get a Gemini key and deploy the grading function
1. Get an API key at [aistudio.google.com](https://aistudio.google.com) → **Get API key**.
2. **Before real students use it:** turn on billing for that Google Cloud project (paid tier) so student answers are not used to improve Google's products, and set a **budget alert at ₹500** (Billing → Budgets & alerts). Check Google's current Gemini API terms.
3. Deploy with the Supabase CLI (from this folder):
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase secrets set GEMINI_API_KEY=your-key ALLOWED_ORIGINS=https://viva.akone.xyz,http://localhost:5173
   npx supabase functions deploy viva
   ```
   (`YOUR-PROJECT-REF` is the part before `.supabase.co` in your project URL.)
4. Try a session at `http://localhost:5173`. If grading fails: Supabase → **Edge Functions → viva → Logs**.

### 6. Put it online at viva.akone.xyz
1. Push this folder to a GitHub repo (`.env` is git-ignored, keep it that way).
2. [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
   - Build command: `npm run build` · Output directory: `dist`
   - Environment variables: the same `VITE_…` values from your `.env`.
3. After the first deploy: the Pages project → **Custom domains → Set up a domain** → `viva.akone.xyz`.
   If akone.xyz's DNS is on Cloudflare this is one click; otherwise add the CNAME it shows at your domain registrar.
4. Sign in on your phone at `https://viva.akone.xyz` and run one full session.

---

## Adding your real lab
1. Copy `supabase/seed/TEMPLATE_your_lab.sql`, fill in the lab, experiments and questions, and run it in the SQL Editor.
2. Hide the sample lab: `update public.labs set is_active = false where id = 'sample-ce-3-dsl';`

Good questions decide whether this works. Use the lab manual, your own past vivas, and 2 seniors. Keep model answers to 3–5 sentences and 3–6 key points.

## Taking payments during the validation week
The paywall shows after 3 free sessions per lab. It records each "I want to buy" click, then shows either your Razorpay payment page link (`VITE_PAY_WEEK_URL`) or your UPI ID plus a WhatsApp button for the screenshot.

When money arrives, activate the pass by hand with the query in `supabase/admin/admin_queries.sql` (section A). Refunds: same file. Later, replace this with a Razorpay webhook.

## Checking the results
`supabase/admin/admin_queries.sql` section B gives signups, activation, repeat use, limit-hit vs asked-to-buy vs paid, score improvement and the hardest questions. Section C exports 30 answers for a senior to blind-grade. Section D shows AI spend so far.

## Limits you can change
In `supabase/functions/viva/index.ts` (redeploy after editing):

| Setting | Default | What it does |
| --- | --- | --- |
| `FREE_SESSIONS_PER_LAB` | 3 | Free sessions per lab (also update `src/lib/supabase.ts`) |
| `QUESTIONS_PER_SESSION` | 10 | Questions in each session |
| `DAILY_GRADE_CAP` | 150 | Max graded answers per student per day |
| `MAX_ANSWER_CHARS` | 1500 | Longer answers are cut before grading |
| `GEMINI_MODEL` (secret) | gemini-2.5-flash-lite | Switch model without code changes |

## How it stays safe and cheap
- The AI key lives only in the server function. The browser never calls Gemini.
- Sessions and grades can only be written by the server function, so free limits can't be bypassed.
- Model answers are hidden from direct database reads; students see them only after answering.
- Every table has row-level security: students see only their own data.
- One graded attempt per question per session, a daily cap, and 3-word minimum answers (scored 0 without calling the AI).
- Account → **Delete my account** removes all of a student's data.

## Known gaps (fine for the validation week)
- Passes are switched on by hand; no Razorpay webhook yet.
- Voice input uses the browser's speech recognition (best in Chrome/Android); typing always works.
- Free projects on Supabase pause after 7 days without activity; upgrade to Pro once you have paying users.
