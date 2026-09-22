# Turning on login

The code is done. These steps connect it to your own Supabase project and
Vercel site. They need your accounts, so they are yours to click through —
about 20–30 minutes the first time.

You will end up with:

- a sign-in screen with **Continue with Google** and **Email me a sign-in link**
- only the **2 emails you list** able to get in — anyone else is refused
- progress saved to your account, so it follows you between Mac and phone

---

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in, **New project**. The free plan is plenty.
2. Pick a name and a database password (save it in your password manager), choose a
   region near you, and wait for it to finish setting up.

## 2. Create the tables and the allowlist

1. Open `supabase/schema.sql` from this repo.
2. Near the top, replace the two example addresses with the **two real emails**
   — the Google account or inbox each person will sign in with.
3. In Supabase: **SQL Editor → New query**, paste the whole file, **Run**.
   You should see "Success. No rows returned."

To add or remove someone later, edit the `allowed_emails` table in
**Table Editor**.

## 3. Give the app its keys

1. Supabase: **Project Settings → API**. Copy the **Project URL** and the
   **anon / public** key.
2. In this folder, create a file called `.env.local` with:

   ```
   VITE_SUPABASE_URL=paste-the-project-url
   VITE_SUPABASE_ANON_KEY=paste-the-anon-key
   ```

   `.env.local` is already git-ignored, so it never goes to GitHub.

## 4. Tell Supabase where the app lives

Supabase: **Authentication → URL Configuration**

- **Site URL**: your Vercel address once you have it (step 6). Until then,
  `http://localhost:3000`.
- **Redirect URLs** — add both:
  - `http://localhost:3000`
  - `https://your-app.vercel.app` (after step 6)

Sign-in links and Google both return to one of these; anything else is refused.

**Email sign-in now works.** Supabase sends the links itself. Its built-in mailer
allows only a few emails per hour — fine for two people.

## 5. Turn on Google (optional)

Skip this if email links are enough.

1. <https://console.cloud.google.com> → create a project → **APIs & Services →
   OAuth consent screen**. Choose **External**, fill in the app name and your
   email, and add both people as **Test users**.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   Under **Authorized redirect URIs** add:
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   (the exact value is shown in Supabase under Authentication → Providers → Google).
3. Copy the **Client ID** and **Client secret** into Supabase:
   **Authentication → Providers → Google**, turn it on, save.

## 6. Deploy on Vercel

1. <https://vercel.com> → **Add New → Project** → import
   `christianwin22/Schritte-Test-2`. It detects Vite on its own.
2. Before deploying, open **Environment Variables** and add the same
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Deploy**. Copy the `https://….vercel.app` address and add it in step 4.

---

## How your existing progress is kept

The first time someone signs in on a browser that already has progress from
before login, that progress is uploaded to their account — nothing is lost.
From then on:

- Changes upload every few seconds, and when the tab is closed.
- Signing in on a new device downloads your saved progress.
- **Sign out** (Settings) saves one last time, then clears this browser so the
  other person can sign in without seeing your data. If you are offline, it
  refuses to sign out rather than lose anything.
- If you study on two devices at the same time, the one that saves last wins.
