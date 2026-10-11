const nodemailer = require("nodemailer");

// Gmail SMTP. Set in .env (never commit real values):
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=you@gmail.com
//   SMTP_PASS=Gmail App Password from Google Account Security, 2FA section
//   MAIL_FROM=you@gmail.com (optional, defaults to SMTP_USER)
//   FRONTEND_URL=https://your-frontend (optional, used to build the reset link)
function mailerConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let _transporter = null;
function transporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
}

// Sends the reset email via Gmail. When SMTP is not configured (local dev),
// the link is logged server-side instead and the API stays silent either way.
async function sendPasswordResetEmail(to, resetUrl) {
  if (!mailerConfigured()) {
    console.log("RESET-LINK for " + to + ": " + resetUrl);
    return { delivered: false };
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await transporter().sendMail({
    from: "Movielanche <" + from + ">",
    to: to,
    subject: "Reset your Movielanche password",
    text: "You requested a password reset. Set a new password here (valid 20 minutes, single use): " + resetUrl,
    html: "<p><a href=\"" + resetUrl + "\">Set a new password</a> (valid 20 minutes, single use).</p>",
  });
  return { delivered: true };
}

function resetUrlForToken(req, rawToken) {
  const base = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const origin = base || (req.protocol + "://" + req.get("host"));
  return origin + "/reset.html?token=" + rawToken;
}

module.exports = { mailerConfigured, sendPasswordResetEmail, resetUrlForToken };
