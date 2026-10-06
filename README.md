# Consolflora site

Static page (`public/index.html`) plus a small Node server (`server.js`) that receives the
appointment form and emails it to the team.

## Deploy on Render
1. Put this folder in a GitHub repository.
2. In Render: New > Web Service > pick the repository. Render reads `render.yaml`
   (build `npm install`, start `npm start`).
3. Add the email settings under Environment (never commit them):
   - Option A, Resend: `RESEND_API_KEY` and `MAIL_FROM` (for example
     `Consolflora Website <bookings@consolflora.com>`). The sending domain must be verified in Resend.
   - Option B, your own mailbox over SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
   - `BOOKING_TO` is where requests arrive (default `info@consolflora.com`).
4. Settings > Custom Domains: add `consolflora.com`, then add the DNS records Render shows.
5. Test: submit the form on the live site and check the inbox. Replying to the email answers the visitor.

Set `DRY_RUN=true` to log requests instead of emailing while testing.

## Real photos
Put approved photos in `photos/` named `hero`, `rose`, `spray`, `summer` (jpg, png or webp),
then rebuild the page. Until then the brand illustrations show.
