# Supabase district login and backup

1. Run `schema.sql` in the Supabase SQL Editor.
2. Create each district user in **Authentication → Users**. The app does not expose public sign-up.
3. As an administrator, add one `district_profiles` row for each user. Use an uppercase district code such as `CHITTORGARH`, `UDAIPUR`, or `BHILWARA`; set `district_name` to its display name.
4. Copy `.env.example` to `.env.local` and set the project URL and public anon key. Never put a service-role key in the browser app.
5. Restart the Vite server and sign in with the provisioned email/password and matching district.

The profile table grants users read access only to their own profile. Row-level security on `district_data` limits reads and writes to the district assigned to that user.
