# ApplyNow Supabase setup

The site source is connected to project `uwjiqiweoquwkdxpvjts`, and its public anon key is configured in `supabase-config.js`. The backend is not ready yet: a live check found that the private `payment-proofs` bucket does not exist. Do not claim the service is live until setup and an end-to-end request have been tested.

## 1. Keep the public anon key configured

No key change is needed in `supabase-config.js`. The browser anon key is public by design. Never put a service-role or secret key in this file.

Both `index.html` and `admin.html` load `supabase-config.js` before their application scripts. The admin screen permits OTP sign-in only for `applynow.admin@gmail.com`; database policies independently enforce admin access.

## 2. Create the database and private proof storage

Open the Supabase **SQL Editor** and run `supabase/schema.sql`. It creates the request table, row-level security policies, private proof bucket, and admin authorization for `applynow.admin@gmail.com`.

## 3. Enable email-code sign-in

In **Authentication → Providers → Email**, enable email sign-in and configure the email template to include the one-time token (`{{ .Token }}`). Configure a production SMTP provider under **Authentication → SMTP Settings**. Add `https://eclectic-blini-35e236.netlify.app/**` to allowed redirect URLs.

## 4. Deploy and verify

Commit and push only after adding the real anon key and running the SQL. Confirm that one learner can request a code, submit a pending R25/R100 request with a private receipt, and that the admin can sign in, view the proof, and approve only after checking Capitec account `2615455962`. Approval is shared with the learner's account. The app does not submit university or NSFAS applications automatically.

The installed phone app updates only after the new site is deployed to the same Netlify URL from which it was installed.
