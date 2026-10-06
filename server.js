'use strict';
// Consolflora site server: serves /public and handles POST /api/appointment.
// No secrets live in this file. Set them as environment variables in Render.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TO = process.env.BOOKING_TO || 'info@consolflora.com';
const FROM = process.env.MAIL_FROM || 'Consolflora Website <bookings@consolflora.com>';
const DRY_RUN = process.env.DRY_RUN === 'true';

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
const HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'"
};

// Simple per-IP limit: 5 requests per hour
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 3600e3;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);

function validate(b) {
  const d = {
    name: clean(b.name, 120), email: clean(b.email, 160), phone: clean(b.phone, 40), company: clean(b.company, 140),
    role: clean(b.role, 20), service: clean(b.service, 60), date: clean(b.date, 10), time: clean(b.time, 20),
    how: clean(b.how, 30), message: clean(b.message, 2000)
  };
  if (!d.name) return { error: 'Name is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return { error: 'A valid email is required' };
  if (!['Buyer', 'Grower', 'Other'].includes(d.role)) return { error: 'Role is required' };
  if (!d.service) return { error: 'Service is required' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return { error: 'Date is required' };
  return { data: d };
}

function compose(d) {
  const rows = [['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Company', d.company], ['I am a', d.role],
    ['Service', d.service], ['Preferred date', d.date], ['Preferred time (Nairobi)', d.time], ['Meeting by', d.how]];
  const text = rows.map(r => `${r[0]}: ${r[1] || '-'}`).join('\n') + `\n\nMessage:\n${d.message || '-'}\n`;
  const htmlBody = `<div style="font-family:Arial,sans-serif;color:#10200f"><h2 style="color:#002903;margin:0 0 12px">New appointment request</h2>` +
    `<table cellpadding="6" style="border-collapse:collapse">${rows.map(r => `<tr><td style="color:#555">${esc(r[0])}</td><td><b>${esc(r[1] || '-')}</b></td></tr>`).join('')}</table>` +
    `<p style="margin-top:16px"><b>Message</b><br>${esc(d.message || '-').replace(/\n/g, '<br>')}</p>` +
    `<p style="color:#777;font-size:12px">Sent from the consolflora.com booking form. Reply to this email to answer the visitor.</p></div>`;
  return { subject: `Appointment request: ${d.service} (${d.name})`, text, html: htmlBody };
}

async function send(d) {
  const m = compose(d);
  if (DRY_RUN) { console.log('[DRY_RUN] would send to', TO, '\n' + m.subject + '\n' + m.text); return; }
  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: d.email, subject: m.subject, text: m.text, html: m.html })
    });
    if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return;
  }
  if (process.env.SMTP_HOST) {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
    await t.sendMail({ from: FROM, to: TO, replyTo: d.email, subject: m.subject, text: m.text, html: m.html });
    return;
  }
  throw new Error('No email provider configured (set RESEND_API_KEY or SMTP_HOST)');
}

function json(res, code, obj) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, HEADERS));
  res.end(JSON.stringify(obj));
}

function handleBooking(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 20000) { req.destroy(); } else chunks.push(c); });
  req.on('end', async () => {
    try {
      let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(res, 400, { ok: false, error: 'Bad request' }); }
      if (body.website) return json(res, 200, { ok: true });          // honeypot: pretend success
      if (limited(ip)) return json(res, 429, { ok: false, error: 'Too many requests' });
      const v = validate(body);
      if (v.error) return json(res, 400, { ok: false, error: v.error });
      await send(v.data);
      json(res, 200, { ok: true });
    } catch (err) {
      console.error('booking failed:', err.message);
      json(res, 502, { ok: false, error: 'Could not send' });
    }
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (url.pathname === '/api/appointment') {
    if (req.method === 'POST') return handleBooking(req, res);
    return json(res, 405, { ok: false });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '/appointment') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, HEADERS); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, Object.assign({ 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' }, HEADERS));
    res.end(buf);
  });
}).listen(PORT, () => console.log('Consolflora site on :' + PORT));
