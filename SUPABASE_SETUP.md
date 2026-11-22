# ApplyNow Supabase setup

The site source is connected to project `uwjiqiweoquwkdxpvjts`, and its public anon key is configured in `supabase-config.js`. The database tables and private `payment-proofs` bucket exist. Do not claim the service is live until an end-to-end request has been tested. The only authorized admin is `applynow.admin@gmail.com`.

## 1. Keep the public anon key configured

No key change is needed in `supabase-config.js`. The browser anon key is public by design. Never put a service-role or secret key in this file.

Both `index.html` and `admin.html` load `supabase-config.js` before their application scripts. The admin screen permits OTP sign-in only for `applynow.admin@gmail.com`; database policies independently enforce that restriction.

## 2. Create the database and private proof storage

Open the Supabase **SQL Editor** and run `supabase/schema.sql`. It creates the request table, row-level security policies, private proof bucket, and replaces the admin authorization list with only `applynow.admin@gmail.com`. It does not delete auth users, test users, student records, requests, or uploaded proofs.

## 3. Enable email OTP login

In **Authentication → Providers → Email**, enable email sign-in. Then open **Authentication → Email Templates** and update both **Confirm signup** and **Magic Link** so the message contains the one-time token (`{{ .Token }}`) and does **not** contain the confirmation link (`{{ .ConfirmationURL }}`). New email addresses use the Confirm signup template; returning email addresses use the Magic Link template, so both must be OTP-only. A suitable body is:

```html
<h2>Your ApplyNow OTP</h2>
<p>Enter this one-time code in ApplyNow:</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
<p>This code expires shortly. If you did not request it, ignore this email.</p>
```

Configure a production SMTP provider under **Authentication → SMTP Settings**. The frontend already requests and verifies an OTP; switching the dashboard templates is what changes the email from a sign-in link to an OTP code. The Site URL may remain the deployed app URL, but no redirect link should be included in either OTP template. Leaving either template on `{{ .ConfirmationURL }}` causes the user to receive a sign-in link instead of the code the website expects.

## 4. Course guide email function

Approving a request calls the `send-course-guide` Edge Function, which emails the learner their course guide. It is limited to 20 emails per hour (`RATE_LIMIT_PER_HOUR` in `supabase/functions/send-course-guide/index.ts`). Deploy it with `supabase functions deploy send-course-guide` and set secrets `RESEND_API_KEY` and `GUIDE_FROM_EMAIL` (a sender verified in Resend). Without them, approval still succeeds and the admin sees that the email was not sent.

## 5. Deploy and verify

Commit and push only after adding the real anon key and running the SQL. Confirm that one learner can request an OTP, submit a pending R25/R100 request with a private receipt, and that the admin can verify the OTP, view the proof, and approve only after checking Capitec account `2615455962`. Approval is shared with the learner's account. The app does not submit university or NSFAS applications automatically.

The installed phone app updates only after the new site is deployed to the same URL from which it was installed. GitHub Pages deploys pushes to `main` through `.github/workflows/pages.yml`; check that the latest workflow succeeds. Deploy the SQL migration and Edge Function separately: the Pages workflow publishes static files only.

The sample catalogue and application-assistance picker include selected private institutions. Their programme names link to official provider pages; admission requirements, fees, funding and application dates must be checked with the provider. NSFAS support for a private institution is not assumed.
