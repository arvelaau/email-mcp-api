const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    logger: false
  });
  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    let messages = [];
    try {
      let searchResult = await client.search({ unseen: true });
      if (searchResult && searchResult.length > 0) {
        let targetSeq = searchResult.slice(-3);
        let range = targetSeq.join(',');
        for await (let message of client.fetch(range, { envelope: true, source: true })) {
          let parsed = await simpleParser(message.source);
          messages.push({
            subject: message.envelope.subject || 'No subject',
            from: message.envelope.from?.[0]?.address || 'Unknown sender',
            date: message.envelope.date,
            content: (parsed.text || '(no text body)').trim().slice(0, 500)
          });
        }
        messages.reverse();
        await client.messageFlagsAdd(range, ['\\Seen']);
      }
    } finally {
      lock.release();
    }
    await client.logout();
    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        emails: [],
        notice: "No new unread emails right now (previous ones already read, no reply yet)."
      });
    }
    return res.status(200).json({ success: true, count: messages.length, emails: messages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
