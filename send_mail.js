const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { subject, content, sender, senderName, sender_name, sendemame } = req.body || req.query || {};
  if (!subject || !content) {
    return res.status(400).json({ error: 'Missing subject or content parameter' });
  }

  const displayName = sender || senderName || sender_name || sendemame || 'AI Companion';

  // Gmail SMTP. Requires a Google Account App Password (not your normal
  // login password) — see the README for how to generate one.
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${displayName}" <${process.env.GMAIL_EMAIL}>`,
      to: process.env.TO_EMAIL || process.env.GMAIL_EMAIL,
      subject: subject,
      text: content,
    });
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
