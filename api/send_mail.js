const nodemailer = require('nodemailer');

// Model kadang nulis subject/isi email dibungkus tanda petik utuh
// (mis. `"Hey Joanne! ..."`) — ini buang tanda petik pembuka-penutup itu,
// bukan tanda petik yang beneran ada di tengah kalimat.
function stripWrappingQuotes(str) {
  if (typeof str !== 'string') return str;
  const trimmed = str.trim();
  const pairs = { '"': '"', "'": "'", '“': '”', '‘': '’' };
  if (trimmed.length >= 2 && pairs[trimmed[0]] === trimmed[trimmed.length - 1]) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  let { subject, content, sender, senderName, sender_name, sendemame } = req.body || req.query || {};
  if (!subject || !content) {
    return res.status(400).json({ error: 'Missing subject or content parameter' });
  }
  subject = stripWrappingQuotes(subject);
  content = stripWrappingQuotes(content);
  const displayName = stripWrappingQuotes(sender || senderName || sender_name || sendemame || 'AI Companion');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  try {
    const info = await transporter.sendMail({
      from: `"${displayName}" <${process.env.GMAIL_EMAIL}>`,
      to: process.env.TO_EMAIL || process.env.GMAIL_EMAIL,
      subject: subject,
      text: content
    });
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
