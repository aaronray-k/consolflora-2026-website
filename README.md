# Consolflora 2026 website

Upload every file in this folder to the root of the GitHub repository (replace existing files).
Render redeploys automatically.

Environment variables (set in Render, never in the repository):
- RESEND_API_KEY  (secret)
- MAIL_FROM       e.g. Consolflora Website <bookings@hello.consolflora.com>
- BOOKING_TO      where appointment requests are delivered

## Shop (/shop)
The flower shop reads `catalogue.json`. Edit that file (or send the spreadsheet to Claude) to add varieties,
photos (upload images to the `catalogue/` folder), colours, stem lengths and prices. A flower with no `price` shows "Price on request".
Set `settings.accountUrl` and `settings.signInUrl` in `catalogue.json` to the Mrpetals sign-up and sign-in pages.
Until accountUrl is set, the buttons say "Request a wholesale account" and lead to the contact form.
To feed the shop live from Mrpetals, set the Render environment variable `CATALOGUE_URL` to a JSON feed in the same format,
and, if its photos are hosted on another site, `CATALOGUE_IMG_HOSTS` (for example `https://xxxx.supabase.co`).
