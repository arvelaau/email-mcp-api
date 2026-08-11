const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Gmail IMAP. Requires IMAP enabled in Gmail settings (Settings > Forwarding
  // and POP/IMAP > Enable IMAP) plus the same App Password used for SMTP.
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    let messages = [];
    try {
      // 1. Look up unread messages in the inbox.
      let searchResult = await client.search({ unseen: true });
      if (searchResult && searchResult.length > 0) {
        // Take the most recent 3 unread messages.
        let targetSeq = searchResult.slice(-3);
        let range = targetSeq.join(',');
        for await (let message of client.fetch(range, { envelope: true, source: true })) {
          let parsed = await simpleParser(message.source);
          messages.push({
            subject: message.envelope.subject || '(no subject)',
            from: message.envelope.from?.[0]?.address || '(unknown sender)',
            date: message.envelope.date,
            content: (parsed.text || '(no text body)').trim().slice(0, 500),
          });
        }
        messages.reverse();
        // 2. Mark these as read after fetching.
        await client.messageFlagsAdd(range, ['\\Seen']);
      }
    } finally {
      lock.release();
    }
    await client.logout();

    // 3. If there's nothing new, say so explicitly for the AI.
    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        emails: [],
        notice: 'No new unread emails right now (previous emails have already been read; no reply yet).',
      });
    }
    return res.status(200).json({ success: true, count: messages.length, emails: messages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
