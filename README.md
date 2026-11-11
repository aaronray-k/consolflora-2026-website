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

## Launch checklist features
- Custom animated 404 page (served with a real 404 status) and /thank-you page, both in EN/NL/FR/DE/ES, noindex.
- Favicon set (favicon.ico, 32px, apple-touch-icon, 192 and 512 icons) and site.webmanifest, built from the real rose mark.
- 1200x630 Open Graph / Twitter image (og-image.png) used on every page.
- Sticky mobile call-to-action bar, loading skeleton in the shop, spinner on the booking button, animated form errors, redirect to /thank-you after a booking.
- Cookieless page-view counter (no IP, no cookie, honours Do Not Track). View totals: open `/api/stats?token=YOUR_TOKEN` after setting the STATS_TOKEN environment variable in Render. Counts reset on restart; each view is also a plain line in the Render logs.
- No cookie banner on purpose: the site sets no cookies. Add one only if you later add consent-requiring tools.
