# ApplyNow Supabase setup

The site source is connected to project `uwjiqiweoquwkdxpvjts`. Email-code login and shared requests require a valid anon key in `supabase-config.js` and the database setup below. The key pasted in chat included explanatory text and was not a complete JWT, so the checked-in local config intentionally remains a placeholder until the exact key is available. Do not claim the service is live until a real request can be tested.

## 1. Add the anon key

In Supabase, open **Project Settings → API Keys** and copy the complete legacy anon key for this project. Replace `PASTE_THE_FULL_SUPABASE_PUBLISHABLE_KEY_HERE` in `supabase-config.js`. This browser key is public by design. Never put a service-role or secret key in this file.

Both `index.html` and `admin.html` load `supabase-config.js` before their application scripts. The admin screen permits OTP sign-in only for `info@applyhubsa.co.za`; database policies independently enforce admin access.

## 2. Create the database and private proof storage

Open the Supabase **SQL Editor** and run `supabase/schema.sql`. It creates the request table, row-level security policies, private proof bucket, and admin authorization for `info@applyhubsa.co.za`.

## 3. Enable email-code sign-in

In **Authentication → Providers → Email**, enable email sign-in and configure the email template to include the one-time token (`{{ .Token }}`). Configure a production SMTP provider under **Authentication → SMTP Settings**. Add `https://eclectic-blini-35e236.netlify.app/**` to allowed redirect URLs.

## 4. Deploy and verify

Commit and push only after adding the real anon key and running the SQL. Confirm that one learner can request a code, submit a pending R25/R100 request with a private receipt, and that the admin can sign in, view the proof, and approve only after checking Capitec account `2615455962`. Approval is shared with the learner's account. The app does not submit university or NSFAS applications automatically.

The installed phone app updates only after the new site is deployed to the same Netlify URL from which it was installed.
