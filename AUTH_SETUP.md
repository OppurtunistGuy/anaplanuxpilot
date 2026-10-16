# Authentication setup

The app uses Supabase Auth through same-origin server endpoints. Access and refresh tokens are held in `HttpOnly`, `SameSite=Lax` cookies; the browser never receives the Supabase service role key. New accounts are allowlisted and remain pending until their server-managed `app_metadata.role` is `tester` or `admin`.

## Configure the app

1. Create a Supabase project and enable email/password authentication with email confirmation.
2. Copy `.env.example` to `.env.local` for local development. Set `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SIGNUP_ALLOWED_EMAILS`, and `INITIAL_TESTER_EMAIL`. Add `LOVABLE_API_KEY` separately when enabling AI generation. Never prefix the service role key with `VITE_` or expose it to the browser.
3. In Supabase Auth URL settings, set the Site URL to `APP_BASE_URL` and allow redirects to `${APP_BASE_URL}/auth/confirmed`.
4. In the Supabase confirmation email template, use a server-verifiable token hash link:

   ```text
   {{ .SiteURL }}/api/auth/verify?token_hash={{ .TokenHash }}&type=signup
   ```

   Ensure `APP_BASE_URL` matches the Supabase Site URL. The callback verifies the one-time token server-side and sets the session cookies.

5. Add the tester email to both `SIGNUP_ALLOWED_EMAILS` and `INITIAL_TESTER_EMAIL`. After the tester signs up and confirms the email, the server assigns the `tester` role using the service role key. The role is stored in Supabase `app_metadata`, which users cannot edit from the client.

Additional allowlisted accounts have no access until an administrator assigns `app_metadata.role` to `tester` or `admin` through a trusted administrative process. Do not use editable user metadata for authorization.

The app does not persist API keys, screenshots, or generated results in browser storage. Results stay in memory for the current tab and are lost on reload or sign-out. Add provider-level rate limits and verify request logging excludes credentials and uploaded planning material before opening the beta to more users.
